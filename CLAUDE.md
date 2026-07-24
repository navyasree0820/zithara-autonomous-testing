# Zithara Playwright Agent Instructions

This repo is the self-testing harness for **campaigns-frontend** against deployed domains:

- Full suite: `https://beta.zithara.com`
- Post-deploy smoke: `https://app.zithara.com`

It follows the [Self-Testing AI Agents](https://stevekinney.com/courses/self-testing-ai-agents) loop: the agent must verify its own work before claiming done.

## What "done" means

A task is not done until these exit zero (when credentials/gates allow):

1. `npm run gates` (or document why a gate is blocked)
2. `npm run test:smoke` against beta
3. For product-impacting FE changes: `npm run test:critical` against beta

If a failure looks unrelated, say so explicitly and link the failing test title + Supabase run id (when dossiers are configured).

## How tests get written

- Prefer a failing test before the fix when fixing regressions.
- End-to-end tests live under `tests/smoke`, `tests/critical`, `tests/nightly`.
- Tag with `@smoke`, `@critical`, `@nightly`, or `@flaky`.
- Use thin page objects in `tests/pages` with role-based locators.

## Playwright locator rules

- `getByRole` first. `getByLabel` or `getByText` second. `data-testid` only when semantics genuinely don't exist.
- Never use raw CSS or XPath selectors in specs.
- Never use `page.waitForTimeout` or `page.waitForLoadState('networkidle')`. Use `expect(locator).toBeVisible()`, `page.waitForResponse`, or `page.waitForURL`.
- Do not fix a failing Playwright test by changing the assertion to match broken UI.

## Safety

- Prefix created entities with `e2e-`.
- Never send live WhatsApp/SMS/email campaigns from tests.
- Never commit `.env`, tokens, or `playwright/.auth/`.

## Auth

`tests/auth.setup.js` builds `playwright/.auth/user.json` using cookie inject, API login, or UI + OTP. See `docs/GO_NO_GO.md` gate G3.
