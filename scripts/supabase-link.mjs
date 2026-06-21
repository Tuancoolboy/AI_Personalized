#!/usr/bin/env node
/**
 * Link Supabase CLI với project remote (một lần / mỗi máy).
 * Usage: npm run db:link
 */

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const ROOT = process.cwd();
const ENV_LOCAL = join(ROOT, ".env.local");

function loadEnvLocal() {
  if (!existsSync(ENV_LOCAL)) return;
  for (const line of readFileSync(ENV_LOCAL, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function projectRefFromUrl(url) {
  const normalized = url.replace(/\/$/, "");
  const match = normalized.match(/https:\/\/([^.]+)\.supabase\.co/i);
  return match?.[1] ?? null;
}

async function promptHidden(question) {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
}

function databasePassword() {
  return (
    process.env.SUPABASE_DB_PASSWORD?.trim() ||
    process.env.SUPABASE_PROJECT_PASSWORD?.trim() ||
    ""
  );
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const projectRef =
    process.env.SUPABASE_PROJECT_REF?.trim() ||
    (supabaseUrl ? projectRefFromUrl(supabaseUrl) : null);

  if (!projectRef) {
    console.error(
      "[db:link] Cần NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_PROJECT_REF trong .env.local",
    );
    process.exit(1);
  }

  let password = databasePassword();
  if (!password) {
    password = await promptHidden(
      "Database password (Supabase Dashboard → Project Settings → Database): ",
    );
  }

  if (!password) {
    console.error("[db:link] Thiếu database password.");
    process.exit(1);
  }

  const args = ["link", "--project-ref", projectRef, "--password", password];
  console.log(`[db:link] Linking project ${projectRef}...`);

  const result = spawnSync("npx", ["-y", "supabase", ...args], {
    cwd: ROOT,
    env: process.env,
    stdio: "inherit",
  });

  process.exit(result.status ?? 1);
}

main().catch((err) => {
  console.error("[db:link]", err.message);
  process.exit(1);
});
