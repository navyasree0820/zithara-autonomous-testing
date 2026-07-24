---
description: Run the Zithara Playwright verify suite (gates, smoke, critical) before claiming frontend or harness work is done.
---

# Verify Suite — Zithara Playwright

Use this skill whenever you change `campaigns-frontend` product flows or this harness and are about to say work is complete.

## Steps

1. Ensure `.env` exists (copy from `.env.example`) with at least auth for gate G3.
2. From `zithara-autonomous-testing` run:
   - `npm run gates`
   - `npm run test:smoke`
   - If campaigns / contacts / templates / segmentation touched: `npm run test:critical`
3. On failure:
   - Read the failing test title
   - Check `dossiers/` or Supabase run id from reporter output
   - Fix or explicitly document an external blocker (OTP/auth, beta down)
4. Never use `waitForTimeout` or weaken assertions to match broken UI.

## MCP shortcuts

If the `zithara-playwright-verify` MCP is connected, prefer:
- `run_gates`
- `run_smoke`
- `run_critical`
- `get_last_failures`
