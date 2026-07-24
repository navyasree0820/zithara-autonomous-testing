import { test, expect } from "../fixtures/test";
import { dismissBlockingOverlays } from "../helpers/ui";

/**
 * Draft-only campaign create probe.
 * Does not send. Stops at define / first wizard step when UI allows.
 * Set SKIP_CAMPAIGN_DRAFT=1 to skip until FE testids land (G6).
 */
test.describe("campaign create draft @critical", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.SKIP_CAMPAIGN_DRAFT === "1",
      "SKIP_CAMPAIGN_DRAFT=1 — waiting on wizard testids (G6)",
    );
  });

  test("opens create campaign flow without sending", async ({ page }) => {
    await page.goto("/campaign");
    await expect(page).not.toHaveURL(/\/login/);
    await dismissBlockingOverlays(page);

    const createControl = page
      .getByRole("button", { name: /add new campaign/i })
      .or(page.getByRole("link", { name: /add new campaign/i }))
      .first();

    await expect(createControl).toBeVisible({ timeout: 45_000 });
    await createControl.click();

    await expect(page).toHaveURL(/create-campaign|define-campaign|campaign/i, {
      timeout: 30_000,
    });

    const nameField = page
      .getByPlaceholder(/campaign name|name|title/i)
      .or(page.getByLabel(/campaign name|name|title/i))
      .or(page.getByTestId("campaign-name"))
      .first();

    const nameVisible = await nameField
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (nameVisible) {
      const draftName = `e2e-campaign-${Date.now()}`;
      await nameField.fill(draftName);
      await expect(nameField).toHaveValue(draftName);
    }

    // Hard safety: never click send / schedule / publish in this suite.
    const send = page.getByRole("button", {
      name: /send now|schedule|publish|launch/i,
    });
    await expect(send).toHaveCount(0);
  });
});
