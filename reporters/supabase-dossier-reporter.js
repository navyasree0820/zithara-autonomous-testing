import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function gitSha() {
  if (process.env.GIT_SHA) return process.env.GIT_SHA;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

function detectEnv(test) {
  const project = test.parent.project();
  const meta = project?.metadata;
  if (meta?.env) return meta.env;
  const name = project?.name || "";
  if (name.includes("app")) return "app";
  if (name.includes("beta")) return "beta";
  return "unknown";
}

function tagsOf(test) {
  return test.tags.map((t) => t.replace(/^@/, ""));
}

class SupabaseDossierReporter {
  constructor() {
    this.client = null;
    this.runId = null;
    this.startedAt = Date.now();
    this.passed = 0;
    this.failed = 0;
    this.flaky = 0;
    this.bucket =
      process.env.SUPABASE_DOSSIER_BUCKET || "playwright-dossiers";
    this.enabled = false;
    this.envHint = "unknown";
    this.localDossierDir = path.resolve("dossiers");
  }

  async onBegin(_config, _suite) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.enabled = Boolean(url && key);
    fs.mkdirSync(this.localDossierDir, { recursive: true });

    if (!this.enabled) {
      console.log(
        "[supabase-dossier] Disabled — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable.",
      );
      return;
    }

    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const trigger =
      process.env.E2E_TRIGGER ||
      (process.env.CI ? "ci" : "local");

    const { data, error } = await this.client
      .from("test_runs")
      .insert({
        env: "unknown",
        trigger,
        status: "running",
        git_sha: gitSha() ?? null,
        playwright_version: process.env.npm_package_version ?? null,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.warn("[supabase-dossier] Failed to create test_runs row:", error?.message);
      this.enabled = false;
      return;
    }

    this.runId = data.id;
    console.log(`[supabase-dossier] test_run id=${this.runId}`);
  }

  async onTestEnd(test, result) {
    const env = detectEnv(test);
    if (this.envHint === "unknown") this.envHint = env;

    if (result.status === "passed") {
      if (result.retry > 0) this.flaky += 1;
      else this.passed += 1;
    } else if (result.status === "failed" || result.status === "timedOut") {
      this.failed += 1;
    }

    if (!this.enabled || !this.client || !this.runId) {
      if (result.status === "failed" || result.status === "timedOut") {
        this.writeLocalDossier(test, result);
      }
      return;
    }

    const { data: resultRow, error } = await this.client
      .from("test_results")
      .insert({
        run_id: this.runId,
        title: test.title,
        file: test.location.file,
        tags: tagsOf(test),
        status: result.status,
        retries: result.retry,
        duration_ms: result.duration,
        error_message: result.error?.message?.slice(0, 4000) ?? null,
      })
      .select("id")
      .single();

    if (error || !resultRow) {
      console.warn("[supabase-dossier] test_results insert failed:", error?.message);
      return;
    }

    if (result.status !== "failed" && result.status !== "timedOut") return;

    const dossier = this.writeLocalDossier(test, result);
    const uploads = await this.uploadArtifacts(result, test.id);

    await this.client.from("test_failures").insert({
      result_id: resultRow.id,
      dossier_path: dossier,
      trace_url: uploads.traceUrl,
      screenshot_url: uploads.screenshotUrl,
      video_url: uploads.videoUrl,
      stdout: result.stdout
        ?.map((c) => (typeof c === "string" ? c : c.toString()))
        .join("")
        .slice(0, 8000),
      suggested_owner: "qa",
    });
  }

  async onEnd(result) {
    if (!this.enabled || !this.client || !this.runId) return;

    const status =
      result.status === "passed"
        ? "passed"
        : result.status === "interrupted"
          ? "aborted"
          : "failed";

    await this.client
      .from("test_runs")
      .update({
        finished_at: new Date().toISOString(),
        status,
        passed: this.passed,
        failed: this.failed,
        flaky: this.flaky,
        duration_ms: Date.now() - this.startedAt,
        env: this.envHint,
      })
      .eq("id", this.runId);

    console.log(
      `[supabase-dossier] finished run=${this.runId} status=${status} passed=${this.passed} failed=${this.failed}`,
    );
  }

  writeLocalDossier(test, result) {
    const safe = test.title.replace(/[^\w.-]+/g, "_").slice(0, 80);
    const dir = path.join(this.localDossierDir, `${Date.now()}_${safe}`);
    fs.mkdirSync(dir, { recursive: true });
    const summary = {
      title: test.title,
      file: test.location.file,
      status: result.status,
      error: result.error?.message,
      attachments: result.attachments.map((a) => ({
        name: a.name,
        path: a.path,
        contentType: a.contentType,
      })),
    };
    fs.writeFileSync(path.join(dir, "summary.json"), JSON.stringify(summary, null, 2));
    return dir;
  }

  async uploadArtifacts(result, testId) {
    const out = {
      traceUrl: null,
      screenshotUrl: null,
      videoUrl: null,
    };
    if (!this.client || !this.runId) return out;

    for (const attachment of result.attachments) {
      if (!attachment.path || !fs.existsSync(attachment.path)) continue;
      const ext = path.extname(attachment.path) || "";
      const key = `${this.runId}/${testId}/${attachment.name}${ext}`;
      const body = fs.readFileSync(attachment.path);
      const { error } = await this.client.storage
        .from(this.bucket)
        .upload(key, body, {
          contentType: attachment.contentType,
          upsert: true,
        });
      if (error) {
        console.warn(`[supabase-dossier] upload ${key} failed:`, error.message);
        continue;
      }
      const { data } = this.client.storage.from(this.bucket).getPublicUrl(key);
      const url = data?.publicUrl ?? key;
      if (attachment.name === "trace") out.traceUrl = url;
      if (attachment.name === "screenshot") out.screenshotUrl = url;
      if (attachment.name === "video") out.videoUrl = url;
    }
    return out;
  }
}

export default SupabaseDossierReporter;
