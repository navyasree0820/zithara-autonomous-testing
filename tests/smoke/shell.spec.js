import { test, expect, expectAuthenticatedShell } from "../fixtures/test";
import { AppShellPage } from "../pages";

test.describe("authenticated shell @smoke", () => {
  test("dashboard loads for authenticated user", async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.gotoDashboard();
    await shell.expectLoaded();
    await expectAuthenticatedShell(page);
  });

  test("authenticated user is not bounced to login from home", async ({
    page,
  }) => {
    await page.goto("/");
    // Middleware redirects `/` → `/dashboard`; AbilityWrapper can sit on a loader first.
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    await expect(page).not.toHaveURL(/\/login/);
    await expectAuthenticatedShell(page);
  });
});
