# AGENTS.md — Zithara Playwright

## Project

- **Language**: JavaScript
- **Package manager**: npm
- **Targets**: `beta.zithara.com` (default), `app.zithara.com` (smoke)
- **App under test**: `campaigns-frontend` (Next.js), deployed — this repo does not start a local webServer

## Verification commands

Before reporting a task complete:

```bash
npm run gates
npm run test:smoke
# when touching campaign/CRM flows:
npm run test:critical
```

On failure, inspect `playwright-report/`, local `dossiers/`, and Supabase `test_runs` / `test_failures` when configured.

## Agent loop

1. Change code or specs
2. If `campaigns-frontend` changed: run `npm run lint` there
3. Run `npm run test:critical` (or `test:smoke` for docs-only / harness-only)
4. On red: keep the dossier; fix or file an issue with the dossier link
5. Do not claim done with failing verify commands unless you explicitly call out an external blocker (auth gate G3, beta down, etc.)

## Locator and waiting policy

See `CLAUDE.md`. Role-first locators; no hardcoded sleeps; no `networkidle`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run gates` | Phase 0 GO/NO-GO automated checks |
| `npm run test:smoke` | `@smoke` on beta |
| `npm run test:critical` | `@critical` on beta |
| `npm run test:app-smoke` | `@smoke` on app |
| `npm run test:nightly` | `@nightly` on beta |
| `npm run mcp` | Local verification MCP server |

## Tags

- `@smoke` — login shell + authenticated shell; safe for app post-deploy
- `@critical` — list pages + draft campaign path
- `@nightly` — broader / slower flows
- `@flaky` — quarantined; do not use to hide real bugs long-term
