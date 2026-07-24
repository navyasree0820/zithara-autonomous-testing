# zithara-autonomous-testing

Self-testing Playwright agent harness for **campaigns-frontend**, inspired by [Self-Testing AI Agents](https://stevekinney.com/courses/self-testing-ai-agents) / [shelf-life](https://github.com/stevekinney/shelf-life).

| Target | Suite |
| --- | --- |
| `https://beta.zithara.com` | smoke + critical (+ nightly) |
| `https://app.zithara.com` | post-deploy `@smoke` only |

## Quick start

```bash
cp .env.example .env
# fill E2E_USER/E2E_PASSWORD and/or E2E_ID_TOKEN/E2E_REFRESH_TOKEN
# optional: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

npm install
npx playwright install chromium
npm run gates
npm run test:smoke
npm run test:critical
```

## Spreadsheet trackers

Paste TSV files from [`spreadsheet/`](spreadsheet/) into Google Sheets (File → Import → Tab):

- `Course_Checklist.tsv`
- `Feature_Priority.tsv`
- `Go_NoGo.tsv`
- `Resources.tsv`
- `Supabase_Schema.tsv`
- `Week_Plan.tsv`

## GO / NO-GO

See [`docs/GO_NO_GO.md`](docs/GO_NO_GO.md). Do not treat the suite as production-ready until G1–G5 and G7 are GO.

## Agent loop

- [`AGENTS.md`](AGENTS.md) — definition of done
- [`CLAUDE.md`](CLAUDE.md) — locator / waiting rules
- MCP: `.mcp.json` → tools `run_smoke`, `run_critical`, `run_gates`, `get_last_failures`, `open_dossier`
- Cursor skill: `.cursor/skills/verify-suite`

## Supabase audit

1. Create a Supabase project
2. Run [`supabase/migrations/001_test_audit.sql`](supabase/migrations/001_test_audit.sql)
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
4. Failures upload traces to bucket `playwright-dossiers` and insert `test_runs` / `test_results` / `test_failures`

## CI

- [`.github/workflows/playwright.yml`](.github/workflows/playwright.yml) — PR/push + nightly critical on beta; scheduled app smoke
- [`.github/workflows/app-post-deploy-smoke.yml`](.github/workflows/app-post-deploy-smoke.yml) — trigger after `app.zithara.com` deploy (`workflow_dispatch` or `repository_dispatch` type `app-deployed`)

### Required GitHub secrets

`E2E_USER`, `E2E_PASSWORD` **or** `E2E_ID_TOKEN` + `E2E_REFRESH_TOKEN`; optional `E2E_OTP`, `E2E_AUTH_API_BASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Safety

- Prefix test data with `e2e-`
- Never send live campaigns from tests
- Never commit `.env` or `playwright/.auth/`


sivagopi@Zithara-2 zithara-autonomous-testing % npm run gates
npm run test:smoke
npm run test:critical
