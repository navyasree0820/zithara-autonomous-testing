import { test } from "../fixtures/test";

/**
 * Placeholder nightly suite — expand in Phase 2+.
 * Kept so `npm run test:nightly` has a stable entrypoint.
 */
test.describe("nightly placeholders @nightly", () => {
  test("rules list loads", async ({ page }) => {
    await page.goto("/rules");
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 45_000,
    });
  });
});
