import path from "node:path";

export function authStoragePath(testsDir) {
  return path.resolve(testsDir, "../playwright/.auth/user.json");
}

function defaultExpiryIso() {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

function cookieHosts() {
  const hosts = new Set();
  for (const envKey of ["E2E_BASE_URL_BETA", "E2E_BASE_URL_APP"]) {
    const raw =
      process.env[envKey] ||
      (envKey === "E2E_BASE_URL_BETA"
        ? "https://beta.zithara.com"
        : "https://app.zithara.com");
    try {
      hosts.add(new URL(raw).hostname);
    } catch {
      /* ignore invalid */
    }
  }
  return [...hosts];
}

export async function injectSessionCookies(context, tokens) {
  const expiry = tokens.expiryIso || defaultExpiryIso();
  const cookies = cookieHosts().flatMap((domain) => [
    {
      name: "id_token",
      value: tokens.idToken,
      domain,
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "refresh_token",
      value: tokens.refreshToken,
      domain,
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "expiry",
      value: expiry,
      domain,
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    },
  ]);

  await context.addCookies(cookies);
}

export async function loginViaApi(args) {
  const base = args.apiBase.replace(/\/$/, "");
  const loginRes = await fetch(`${base}/v2/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      identifier: args.identifier,
      password: args.password,
    }),
  });
  const loginJson = await loginRes.json();
  const data = loginJson?.data?.data ?? loginJson?.data ?? {};

  if (data.refreshToken && data.idToken) {
    const expiresIn = Number(data.expiresIn || 3600);
    return {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiryIso: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  if (data.session) {
    if (!args.otp) {
      throw new Error(
        "API login requires OTP — set E2E_OTP or use cookie inject / OTP bypass",
      );
    }
    const verifyRes = await fetch(`${base}/v2/auth/verify-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        session: data.session,
        code: args.otp,
        identifier: args.identifier,
        type: data.type,
      }),
    });
    const verifyJson = await verifyRes.json();
    const verified = verifyJson?.data?.data ?? verifyJson?.data ?? {};
    if (!verified.refreshToken || !verified.idToken) {
      throw new Error(
        `verify-login failed: ${JSON.stringify(verifyJson).slice(0, 300)}`,
      );
    }
    const expiresIn = Number(verified.expiresIn || 3600);
    return {
      idToken: verified.idToken,
      refreshToken: verified.refreshToken,
      expiryIso: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  throw new Error(
    `Unexpected login response: ${JSON.stringify(loginJson).slice(0, 300)}`,
  );
}

export async function loginViaUi(page, args) {
  await page.goto("/login");
  await page
    .getByPlaceholder(/enter email, phone or user name/i)
    .fill(args.identifier);
  await page.getByPlaceholder(/enter your password/i).fill(args.password);
  await page.getByRole("button", { name: /^login$/i }).click();

  const otpField = page.getByLabel(/pin|otp|one-time/i);
  const otpVisible = await otpField
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => true)
    .catch(() => false);

  if (otpVisible) {
    if (!args.otp) {
      throw new Error(
        "UI login showed OTP step — set E2E_OTP or use cookie inject (G3)",
      );
    }
    await otpField.fill(args.otp);
    await page
      .getByRole("button", { name: /verify|submit|continue|confirm/i })
      .click();
  }

  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 45_000,
  });
}
