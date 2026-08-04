import { test as base, expect } from "@playwright/test";
import { appShellMarker, dismissBlockingOverlays } from "../helpers/ui";

export const test = base.extend({
  /** Authenticated page already using storageState from setup project. */
  authedPage: async ({ page }, use) => {
    await use(page);
  },
});

export { expect };

/** Wait until authenticated shell finished bootstrapping (left login, app chrome up). */
export async function expectAuthenticatedShell(page) {
  await expect(page).not.toHaveURL(/\/login/);
  await dismissBlockingOverlays(page);
  await expect(appShellMarker(page)).toBeVisible({ timeout: 45_000 });
}
