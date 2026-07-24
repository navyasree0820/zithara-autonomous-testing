import { test, expect } from "../fixtures/test";
import { LoginPage } from "../pages";

test.describe("login @smoke", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login form is visible", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.expectFormVisible();
    await expect(
      page.getByRole("button", { name: /sign in|log in|login|continue/i }),
    ).toBeVisible();
  });
});
