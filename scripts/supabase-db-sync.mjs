#!/usr/bin/env node
/**
 * Đồng bộ migration Supabase lên project remote trước khi chạy app.
 * Gọi tự động qua npm lifecycle `predev`, hoặc thủ công: npm run db:sync
 *
 * Cần (một lần):
 *   1. supabase login  HOẶC  SUPABASE_ACCESS_TOKEN trong .env.local
 *   2. npm run db:link (hoặc supabase link --project-ref ...)
 *
 * Tuỳ chọn .env.local:
 *   SUPABASE_DB_SYNC=false     — tắt auto sync trước dev
 *   SUPABASE_DB_SYNC_STRICT=true — fail dev nếu chưa link được CLI
 */

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = process.cwd();
const ENV_LOCAL = join(ROOT, ".env.local");
const PROJECT_REF_FILE = join(ROOT, "supabase", ".temp", "project-ref");

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

function log(message) {
  console.log(`[db:sync] ${message}`);
}

function warn(message) {
  console.warn(`[db:sync] ⚠ ${message}`);
}

function isTruthy(value) {
  return value === "1" || value === "true" || value === "yes";
}

function isFalsy(value) {
  return value === "0" || value === "false" || value === "no";
}

function projectRefFromUrl(url) {
  const normalized = url.replace(/\/$/, "");
  const match = normalized.match(/https:\/\/([^.]+)\.supabase\.co/i);
  return match?.[1] ?? null;
}

function readLinkedProjectRef() {
  if (!existsSync(PROJECT_REF_FILE)) return null;
  const ref = readFileSync(PROJECT_REF_FILE, "utf8").trim();
  return ref || null;
}

function runSupabase(args, { allowFailure = false } = {}) {
  const result = spawnSync("npx", ["-y", "supabase", ...args], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status !== 0 && !allowFailure) {
    const error = new Error(output || `supabase ${args.join(" ")} failed`);
    error.exitCode = result.status ?? 1;
    throw error;
  }

  return { status: result.status ?? 0, output };
}

function databasePassword() {
  return (
    process.env.SUPABASE_DB_PASSWORD?.trim() ||
    process.env.SUPABASE_PROJECT_PASSWORD?.trim() ||
    ""
  );
}

function tryAutoLink(projectRef) {
  const password = databasePassword();
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();

  if (!password) {
    return false;
  }

  log(`Đang link project ${projectRef}...`);
  const args = ["link", "--project-ref", projectRef, "--password", password];
  if (token) {
    process.env.SUPABASE_ACCESS_TOKEN = token;
  }

  const { status, output } = runSupabase(args, { allowFailure: true });
  if (status === 0) {
    log("Link Supabase thành công.");
    return true;
  }

  warn(`Không link được tự động: ${output.split("\n")[0] ?? "unknown error"}`);
  return false;
}

function ensureLinked(projectRef) {
  const linked = readLinkedProjectRef();
  if (linked) {
    if (linked !== projectRef) {
      warn(
        `CLI đang link tới ${linked}, khác với .env (${projectRef}). Chạy lại: npm run db:link`,
      );
    }
    return true;
  }

  return tryAutoLink(projectRef);
}

function main() {
  loadEnvLocal();

  const validate = spawnSync("node", ["scripts/validate-migration-names.mjs"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (validate.status !== 0) {
    process.exit(validate.status ?? 1);
  }

  if (isFalsy(process.env.SUPABASE_DB_SYNC)) {
    log("Bỏ qua (SUPABASE_DB_SYNC=false).");
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    log("Bỏ qua — chưa cấu hình NEXT_PUBLIC_SUPABASE_URL (demo mode).");
    return;
  }

  const projectRef =
    process.env.SUPABASE_PROJECT_REF?.trim() ||
    projectRefFromUrl(supabaseUrl);

  if (!projectRef) {
    warn(
      "Không suy ra project ref từ NEXT_PUBLIC_SUPABASE_URL. Thêm SUPABASE_PROJECT_REF vào .env.local.",
    );
    if (isTruthy(process.env.SUPABASE_DB_SYNC_STRICT)) process.exit(1);
    return;
  }

  if (!ensureLinked(projectRef)) {
    warn(
      "Chưa link Supabase CLI. Chạy một lần: npm run db:link (cần SUPABASE_DB_PASSWORD + supabase login hoặc SUPABASE_ACCESS_TOKEN).",
    );
    if (isTruthy(process.env.SUPABASE_DB_SYNC_STRICT)) process.exit(1);
    return;
  }

  log(`Đẩy migration lên ${projectRef}...`);
  try {
    const { output } = runSupabase(["db", "push", "--linked"]);
    if (output) {
      for (const line of output.split("\n")) {
        if (line.trim()) log(line.trim());
      }
    }
    log("Migration remote đã đồng bộ.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[db:sync] ✗ ${message}`);
    console.error(
      "[db:sync] Nếu DB đã apply migration thủ công trước đó, xem: npm run db:repair:help",
    );
    process.exit(1);
  }
}

main();
