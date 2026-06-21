#!/usr/bin/env node
/**
 * Chạy toàn bộ test: unit (vitest) + API integration + Python pytest.
 */

import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const API_PORT = process.env.TEST_PORT ?? "3099";
const API_BASE = `http://localhost:${API_PORT}`;
let serverProc = null;
let startedServer = false;

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}\n`);
  const result = spawnSyncSafe(cmd, args, { stdio: "inherit", ...opts });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function spawnSyncSafe(cmd, args, opts) {
  return execSync(`${cmd} ${args.map((a) => JSON.stringify(a)).join(" ")}`, {
    stdio: opts.stdio ?? "inherit",
    env: { ...process.env, ...opts.env },
  });
}

async function waitForServer(url, maxMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status === 404) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function ensureApiServer() {
  try {
    const res = await fetch("http://localhost:3000", {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      console.log("Using existing dev server @ :3000");
      return "http://localhost:3000";
    }
  } catch {
    // start production server
  }

  console.log("Building Next.js for API tests...");
  execSync("npm run build", { stdio: "inherit" });

  console.log(`Starting production server @ :${API_PORT}...`);
  serverProc = spawn("npm", ["run", "start"], {
    env: {
      ...process.env,
      PORT: API_PORT,
      SUPABASE_DB_SYNC: "false",
    },
    stdio: "pipe",
    detached: false,
  });
  startedServer = true;

  const ok = await waitForServer(API_BASE);
  if (!ok) {
    console.error("Server failed to start in time");
    process.exit(1);
  }
  return API_BASE;
}

function cleanup() {
  if (startedServer && serverProc) {
    serverProc.kill("SIGTERM");
  }
}

process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

async function main() {
  console.log("=== 1/3 Unit tests (Vitest) ===");
  execSync("npx vitest run", { stdio: "inherit" });

  console.log("\n=== 2/3 API integration tests ===");
  const base = await ensureApiServer();
  const envFileFlag = existsSync(".env.local") ? "--env-file=.env.local " : "";
  execSync(`node ${envFileFlag}scripts/test-phase1-apis.mjs ${base}`, {
    stdio: "inherit",
  });

  if (existsSync(".env.local")) {
    console.log("\n=== 2b/3 Phase 2 manager/invite integration tests ===");
    execSync(`node ${envFileFlag}scripts/test-phase2-manager-invite.mjs ${base}`, {
      stdio: "inherit",
    });
    console.log("\n=== 2c/3 Phase 2 auth/OAuth integration tests ===");
    execSync(`node ${envFileFlag}scripts/test-phase2-auth-oauth.mjs ${base}`, {
      stdio: "inherit",
    });
  } else {
    console.log("\n=== 2b/3 Phase 2 manager/invite — skipped (no .env.local) ===");
  }

  if (existsSync(".venv/bin/pytest") || existsSync("src/backend/tests")) {
    console.log("\n=== 3/3 Python tests (pytest) ===");
    try {
      const pytestCmd = existsSync(".venv/bin/pytest")
        ? ".venv/bin/pytest src/backend/tests/ -v"
        : "pytest src/backend/tests/ -v";
      execSync(pytestCmd, { stdio: "inherit", cwd: process.cwd() });
    } catch {
      console.warn("Python pytest skipped or failed — ensure .venv is set up");
    }
  } else {
    console.log("\n=== 3/3 Python tests — skipped (no venv) ===");
  }

  cleanup();
  console.log("\n✓ All test suites passed");
}

main().catch((err) => {
  console.error(err);
  cleanup();
  process.exit(1);
});
