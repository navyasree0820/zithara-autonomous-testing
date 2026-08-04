import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

const betaBaseURL =
  process.env.E2E_BASE_URL_BETA || "https://beta.zithara.com";
const appBaseURL =
  process.env.E2E_BASE_URL_APP || "https://app.zithara.com";
const authFile = path.join(__dirname, "playwright/.auth/user.json");

const reporters = [
  ["list"],
  ["html", { open: "never" }],
  ["./reporters/supabase-dossier-reporter.js"],
];

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: reporters,
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: "beta-public",
      testMatch: /smoke\/login\.spec\.js/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: betaBaseURL,
        storageState: { cookies: [], origins: [] },
      },
      metadata: { env: "beta" },
    },
    {
      name: "setup",
      testMatch: /auth\.setup\.js/,
      use: { baseURL: betaBaseURL },
    },
    {
      name: "beta-chromium",
      dependencies: ["setup"],
      testMatch: /.*\.spec\.js/,
      testIgnore: /smoke\/login\.spec\.js/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: betaBaseURL,
        storageState: authFile,
      },
      metadata: { env: "beta" },
    },
    {
      name: "app-smoke",
      dependencies: ["setup"],
      testMatch: /smoke\/shell\.spec\.js/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: appBaseURL,
        storageState: authFile,
      },
      metadata: { env: "app" },
    },
  ],
});
