#!/usr/bin/env node
/**
 * Phase 0 gate readiness check.
 * Exit 0 = all automated checks pass (human gates may still be Pending).
 * Exit 1 = hard failures (missing required config or unreachable envs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvFile() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();

const results = [];

function record(gate, ok, message) {
  results.push({ gate, ok, message });
  const mark = ok ? "GO" : "NO-GO";
  console.log(`[${mark}] ${gate}: ${message}`);
}

async function checkUrl(name, url, { noGoOn403 = false } = {}) {
  if (!url) {
    record(name, false, "URL not set");
    return;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (noGoOn403 && res.status === 403) {
      record(
        name,
        false,
        `${url} → HTTP 403 (WAF/IP allowlist — NO-GO for browser tests until allowlisted)`,
      );
      return;
    }
    record(name, res.status < 500, `${url} → HTTP ${res.status}`);
  } catch (err) {
    record(name, false, `${url} → ${err.message}`);
  }
}

const beta = process.env.E2E_BASE_URL_BETA || "https://beta.zithara.com";
const app = process.env.E2E_BASE_URL_APP || "https://app.zithara.com";

await checkUrl("G1 beta", beta, { noGoOn403: true });
await checkUrl("G1 app", app);
await checkUrl("G1 beta/login", `${beta.replace(/\/$/, "")}/login`, {
  noGoOn403: true,
});

const hasUser = Boolean(process.env.E2E_USER && process.env.E2E_PASSWORD);
const hasCookies = Boolean(
  process.env.E2E_ID_TOKEN && process.env.E2E_REFRESH_TOKEN,
);
record(
  "G2/G3 credentials",
  hasUser || hasCookies,
  hasCookies
    ? "Cookie inject configured"
    : hasUser
      ? "User/password configured (OTP may still be required)"
      : "Set E2E_USER/E2E_PASSWORD or E2E_ID_TOKEN/E2E_REFRESH_TOKEN",
);

const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
record(
  "G4 gitignore",
  gitignore.includes(".env") && gitignore.includes("playwright/.auth"),
  ".env and playwright/.auth ignored",
);

record(
  "G5 policy",
  fs.existsSync(path.join(root, "docs/GO_NO_GO.md")),
  "Data safety policy documented in docs/GO_NO_GO.md",
);

record(
  "G6 selector contract",
  true,
  "Human gate — confirm FE testid ticket (not auto-failing)",
);

const supabaseConfigured = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
record(
  "G7 Supabase",
  supabaseConfigured,
  supabaseConfigured
    ? "SUPABASE_URL + SERVICE_ROLE set"
    : "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (optional until dossiers enabled)",
);

const hardFail = results.filter(
  (r) =>
    !r.ok &&
    (r.gate.startsWith("G1") ||
      r.gate.startsWith("G2") ||
      r.gate.startsWith("G4") ||
      r.gate.startsWith("G5")),
);

if (hardFail.length) {
  console.log(`\n${hardFail.length} hard gate failure(s).`);
  process.exit(1);
}

console.log("\nAutomated gate checks passed (complete human Status column in spreadsheet/Go_NoGo.tsv).");
