import { expect } from "@playwright/test";
import { appShellMarker, dismissBlockingOverlays } from "../helpers/ui";

export class AppShellPage {
  constructor(page) {
    this.page = page;
  }

  async gotoDashboard() {
    await this.page.goto("/dashboard");
  }

  async expectLoaded() {
    await expect(this.page).not.toHaveURL(/\/login/);
    await dismissBlockingOverlays(this.page);
    await expect(appShellMarker(this.page)).toBeVisible({ timeout: 45_000 });
  }
}

export class LoginPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/login");
  }

  async expectFormVisible() {
    // FormLabel wraps a div around the input, so getByLabel often fails — use placeholders.
    await expect(
      this.page.getByPlaceholder(/enter email, phone or user name/i),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      this.page.getByPlaceholder(/enter your password/i),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: /^login$/i }),
    ).toBeVisible();
  }
}

export class ListPage {
  constructor(page, path) {
    this.page = page;
    this.path = path;
  }

  async goto() {
    await this.page.goto(this.path);
  }

  async expectNotLogin() {
    await expect(this.page).not.toHaveURL(/\/login/);
  }

  async expectLoaded() {
    await dismissBlockingOverlays(this.page);
    await expect(appShellMarker(this.page)).toBeVisible({ timeout: 45_000 });
  }
}
