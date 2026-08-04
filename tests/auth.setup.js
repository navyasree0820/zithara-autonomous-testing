import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  authStoragePath,
  injectSessionCookies,
  loginViaApi,
  loginViaUi,
} from "./helpers/auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = authStoragePath(__dirname);

async function tokensFromContext(context) {
  const cookies = await context.cookies();
  const idToken = cookies.find((c) => c.name === "id_token")?.value;
  const refreshToken = cookies.find((c) => c.name === "refresh_token")?.value;
  const expiryIso = cookies.find((c) => c.name === "expiry")?.value;
  if (!idToken || !refreshToken) return null;
  return { idToken, refreshToken, expiryIso };
}

async function persistDualDomainAuth(context, page, tokens) {
  await injectSessionCookies(context, tokens);
  await page.goto("/dashboard");
  await expect(page).not.toHaveURL(/\/login/);
  // Skip onboarding overlay for all authenticated runs (saved in storageState).
  await page.evaluate(() => {
    localStorage.setItem("tutorial_completed", "true");
  });
  // Close blocking platform modals so storageState captures a usable UI.
  const critical = page.getByRole("dialog", {
    name: /critical issue|important update|announcement/i,
  });
  if (
    await critical
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false)
  ) {
    await critical.getByRole("button", { name: /^close$/i }).first().click();
  }
  await context.storageState({ path: authFile });
}

setup("authenticate", async ({ page, context }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  const hasCookies = Boolean(
    process.env.E2E_ID_TOKEN && process.env.E2E_REFRESH_TOKEN,
  );
  const hasUser = Boolean(process.env.E2E_USER && process.env.E2E_PASSWORD);

  if (!hasCookies && !hasUser) {
    throw new Error(
      "Auth setup blocked (G3): set E2E_ID_TOKEN+E2E_REFRESH_TOKEN or E2E_USER+E2E_PASSWORD in .env",
    );
  }

  if (hasCookies) {
    await persistDualDomainAuth(context, page, {
      idToken: process.env.E2E_ID_TOKEN,
      refreshToken: process.env.E2E_REFRESH_TOKEN,
      expiryIso: process.env.E2E_EXPIRY_ISO,
    });
    return;
  }

  const apiBase = process.env.E2E_AUTH_API_BASE_URL;
  if (apiBase) {
    try {
      const tokens = await loginViaApi({
        apiBase,
        identifier: process.env.E2E_USER,
        password: process.env.E2E_PASSWORD,
        otp: process.env.E2E_OTP,
      });
      await persistDualDomainAuth(context, page, tokens);
      return;
    } catch (err) {
      console.warn(
        `API login failed, falling back to UI: ${err.message}`,
      );
    }
  }

  await loginViaUi(page, {
    identifier: process.env.E2E_USER,
    password: process.env.E2E_PASSWORD,
    otp: process.env.E2E_OTP,
  });
  await expect(page).not.toHaveURL(/\/login/);

  const fromUi = await tokensFromContext(context);
  if (!fromUi) {
    throw new Error("UI login succeeded but id_token/refresh_token cookies missing");
  }
  await persistDualDomainAuth(context, page, fromUi);
});
