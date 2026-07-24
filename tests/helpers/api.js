/**
 * Hybrid API helpers (Phase 2). Prefer seeding via API then asserting in UI.
 */
export function authApiBase() {
  return (
    process.env.E2E_AUTH_API_BASE_URL ||
    "https://dev-api-campaign.zithara.com"
  ).replace(/\/$/, "");
}

export function e2ePrefix(label) {
  return `e2e-${label}-${Date.now()}`;
}
