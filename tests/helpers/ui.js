import { expect } from "@playwright/test";

/** App category bar — primary authenticated landmark (no global <main>). */
export function appNav(page) {
  return page.getByRole("navigation", { name: /application categories/i });
}

/** Shell markers that survive even if aria-label wording drifts. */
export function appShellMarker(page) {
  return appNav(page)
    .or(page.getByRole("button", { name: /^Marketing$/i }))
    .or(page.getByRole("button", { name: /^Quick$/i }))
    .or(page.getByText(/Credits/i))
    .first();
}

/**
 * Dismiss blocking modals that hide the app behind aria-modal overlays.
 * Order: critical banners → layout tutorial.
 */
export async function dismissBlockingOverlays(page) {
  // Platform "Critical Issue Detected" (and similar) modals
  for (let i = 0; i < 3; i++) {
    const critical = page.getByRole("dialog", {
      name: /critical issue|important update|announcement/i,
    });
    const criticalVisible = await critical
      .waitFor({ state: "visible", timeout: 1_500 })
      .then(() => true)
      .catch(() => false);
    if (!criticalVisible) break;

    const close = critical
      .getByRole("button", { name: /^close$/i })
      .or(critical.getByRole("button", { name: /skip|dismiss|got it/i }))
      .first();
    if (await close.isVisible().catch(() => false)) {
      await close.click();
      await expect(critical).toBeHidden({ timeout: 10_000 });
    } else {
      break;
    }
  }

  await dismissLayoutTutorial(page);
}

/** Dismiss "Layout tutorial" onboarding if it is open. */
export async function dismissLayoutTutorial(page) {
  const dialog = page.getByRole("dialog", { name: /layout tutorial/i });
  const visible = await dialog
    .waitFor({ state: "visible", timeout: 2_000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) return;

  const skip = dialog.getByRole("button", { name: /skip for now/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  } else {
    const done = dialog.getByRole("button", { name: /done/i });
    if (await done.isVisible().catch(() => false)) await done.click();
  }
  await expect(dialog).toBeHidden({ timeout: 10_000 });
}

/** Persist tutorial skip into localStorage (also saved via storageState). */
export async function markTutorialCompleted(page) {
  await page.evaluate(() => {
    localStorage.setItem("tutorial_completed", "true");
  });
}
