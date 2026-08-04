# GO / NO-GO Gates (Phase 0)

Do not treat Phase 1 specs as production-ready until **G1–G5** and **G7** are GO. G6 can run in parallel.

Run a local readiness check:

```bash
npm run gates
```

| Gate | GO criteria | Evidence | Owner fills |
| --- | --- | --- | --- |
| G1 Environments | `https://beta.zithara.com` and `https://app.zithara.com` reachable; API hosts documented in `.env`. **Beta may return ELB HTTP 403 (WAF/IP allowlist)** — treat that as **NO-GO** for browser tests until the runner IP is allowlisted. | `npm run gates` HTTP checks | |
| G2 Test merchant | Dedicated beta merchant + user with broad CASL perms; no real customer PII | Merchant id + `E2E_USER` | |
| G3 Auth automation | Cookie inject (`E2E_ID_TOKEN` + `E2E_REFRESH_TOKEN`) **or** OTP bypass / fixed `E2E_OTP` so `auth.setup` produces `playwright/.auth/user.json` headless | `npm run test:smoke` | |
| G4 Secrets | Creds only in `.env` / CI secrets; `.auth` and `.env` gitignored | `git check-ignore` | |
| G5 Data safety | Disposable entities use `e2e-` prefix; no live send; cleanup policy agreed | Written policy below | |
| G6 Selector contract | FE adds `data-testid` for campaign wizard / import within one sprint | Ticket link | |
| G7 Supabase sink | Project URL + service role; migrations applied; bucket `playwright-dossiers` | Reporter inserts a row | |

## Data safety policy (G5)

- Prefix any created campaign, segment, contact, or import name with `e2e-`.
- Phase 1 campaign flow must **save draft only** — never send WhatsApp/SMS/email.
- Do not delete-all or mutate production customers on `app.zithara.com`.
- Prefer cleanup of `e2e-*` entities older than 7 days (backend cron or teardown).

## Auth strategies (G3)

Preferred order used by `tests/auth.setup.js`:

1. **Cookie inject** — set `E2E_ID_TOKEN`, `E2E_REFRESH_TOKEN`, optional `E2E_EXPIRY_ISO`
2. **API login** — `E2E_AUTH_API_BASE_URL` + user/password; if response needs OTP, set `E2E_OTP`
3. **UI login** — fill login form; if OTP step appears, use `E2E_OTP`

Backend OTP bypass for the test merchant is the long-term preferred path.
