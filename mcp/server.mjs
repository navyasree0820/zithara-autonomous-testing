#!/usr/bin/env node
/**
 * Minimal stdio MCP server for the Zithara verify loop.
 * Tools: run_smoke, run_critical, run_gates, get_last_failures, open_dossier
 *
 * Wire in Cursor via .mcp.json (see repo root).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const tools = [
  {
    name: "run_gates",
    description: "Run Phase 0 GO/NO-GO automated gate checks (npm run gates)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "run_smoke",
    description: "Run @smoke Playwright suite against beta.zithara.com",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "run_critical",
    description: "Run @critical Playwright suite against beta.zithara.com",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_last_failures",
    description:
      "List recent local failure dossiers under dossiers/ (summary.json)",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max dossiers to return" },
      },
    },
  },
  {
    name: "open_dossier",
    description: "Read a local dossier summary.json by folder name or path",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute path or folder name under dossiers/",
        },
      },
      required: ["path"],
    },
  },
];

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function runNpm(script) {
  return new Promise((resolve) => {
    const child = spawn("npm", ["run", script], {
      cwd: root,
      env: process.env,
      shell: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("close", (code) => {
      resolve({
        content: [
          {
            type: "text",
            text: `exit=${code}\n\nSTDOUT:\n${stdout.slice(-12000)}\n\nSTDERR:\n${stderr.slice(-6000)}`,
          },
        ],
        isError: code !== 0,
      });
    });
  });
}

function getLastFailures(limit = 5) {
  const dir = path.join(root, "dossiers");
  if (!fs.existsSync(dir)) {
    return {
      content: [{ type: "text", text: "No dossiers/ directory yet." }],
    };
  }
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .reverse()
    .slice(0, limit);

  const payloads = entries.map((name) => {
    const summaryPath = path.join(dir, name, "summary.json");
    if (!fs.existsSync(summaryPath)) return { name, missing: true };
    return {
      name,
      summary: JSON.parse(fs.readFileSync(summaryPath, "utf8")),
    };
  });

  return {
    content: [{ type: "text", text: JSON.stringify(payloads, null, 2) }],
  };
}

function openDossier(inputPath) {
  let target = inputPath;
  if (!path.isAbsolute(target)) {
    target = path.join(root, "dossiers", inputPath);
  }
  const summaryPath = fs.existsSync(path.join(target, "summary.json"))
    ? path.join(target, "summary.json")
    : target;
  if (!fs.existsSync(summaryPath)) {
    return {
      content: [{ type: "text", text: `Not found: ${summaryPath}` }],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text",
        text: fs.readFileSync(summaryPath, "utf8"),
      },
    ],
  };
}

async function handleTool(name, args = {}) {
  switch (name) {
    case "run_gates":
      return runNpm("gates");
    case "run_smoke":
      return runNpm("test:smoke");
    case "run_critical":
      return runNpm("test:critical");
    case "get_last_failures":
      return getLastFailures(args.limit ?? 5);
    case "open_dossier":
      return openDossier(args.path);
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

const rl = readline.createInterface({ input: process.stdin });

rl.on("line", async (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }

  if (msg.method === "initialize") {
    send({
      jsonrpc: "2.0",
      id: msg.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "zithara-playwright-verify", version: "1.0.0" },
      },
    });
    return;
  }

  if (msg.method === "notifications/initialized") return;

  if (msg.method === "tools/list") {
    send({
      jsonrpc: "2.0",
      id: msg.id,
      result: { tools },
    });
    return;
  }

  if (msg.method === "tools/call") {
    const result = await handleTool(msg.params?.name, msg.params?.arguments);
    send({
      jsonrpc: "2.0",
      id: msg.id,
      result,
    });
    return;
  }

  if (msg.id !== undefined) {
    send({
      jsonrpc: "2.0",
      id: msg.id,
      error: { code: -32601, message: `Method not found: ${msg.method}` },
    });
  }
});
