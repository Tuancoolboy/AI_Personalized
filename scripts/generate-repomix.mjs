#!/usr/bin/env node
/**
 * Xuất toàn bộ codebase thành 1 file Repomix XML đầy đủ.
 * Mỗi lần chạy tạo file mới trong .repomix/ (timestamp) + cập nhật repomix-latest.xml.
 *
 * Usage:
 *   npm run repomix
 *   npm run repomix:full          # gồm cả src/backend/next_clone/**
 *   FULL=1 node scripts/generate-repomix.mjs   # macOS/Linux
 *   node scripts/generate-repomix.mjs --full   # cross-platform
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, ".repomix");
const BASE_CONFIG = join(ROOT, "repomix.config.json");
const NEXT_CLONE_PATTERN = "src/backend/next_clone/**";

const isFull =
  process.argv.includes("--full") ||
  process.env.FULL === "1" ||
  process.env.FULL === "true";

function log(message) {
  console.log(`[repomix] ${message}`);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function localTimestamp() {
  const d = new Date();
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function resolveRepomixBin() {
  const binName = process.platform === "win32" ? "repomix.cmd" : "repomix";
  const localBin = join(ROOT, "node_modules", ".bin", binName);
  if (existsSync(localBin)) return localBin;
  return null;
}

function buildConfigPath() {
  if (!isFull) return BASE_CONFIG;

  const config = JSON.parse(readFileSync(BASE_CONFIG, "utf8"));
  config.ignore.customPatterns = config.ignore.customPatterns.filter(
    (pattern) => pattern !== NEXT_CLONE_PATTERN,
  );

  const fullConfigPath = join(OUT_DIR, ".repomix-full.config.json");
  writeFileSync(fullConfigPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  log(`Chế độ FULL: bao gồm ${NEXT_CLONE_PATTERN}`);
  return fullConfigPath;
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function main() {
  if (!existsSync(BASE_CONFIG)) {
    console.error("[repomix] Thiếu repomix.config.json ở root repo.");
    process.exit(1);
  }

  const repomixBin = resolveRepomixBin();
  if (!repomixBin) {
    console.error("[repomix] Chưa cài repomix. Chạy: npm install");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const baseTimestamp = localTimestamp();
  let timestamp = baseTimestamp;
  let outputFile = join(OUT_DIR, `repomix-${timestamp}.xml`);
  let suffix = 2;
  while (existsSync(outputFile)) {
    timestamp = `${baseTimestamp}-${suffix}`;
    outputFile = join(OUT_DIR, `repomix-${timestamp}.xml`);
    suffix += 1;
  }

  const latestFile = join(OUT_DIR, "repomix-latest.xml");
  const configPath = buildConfigPath();

  log(`Đang pack → ${outputFile}`);

  const result = spawnSync(
    repomixBin,
    ["--config", configPath, "--output", outputFile],
    {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    },
  );

  if (result.error) {
    console.error(`[repomix] Lỗi spawn: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`[repomix] repomix thoát với mã ${result.status ?? 1}.`);
    process.exit(result.status ?? 1);
  }

  if (!existsSync(outputFile)) {
    console.error("[repomix] Không tìm thấy file output sau khi repomix chạy xong.");
    process.exit(1);
  }

  copyFileSync(outputFile, latestFile);

  const { size } = statSync(outputFile);
  log(`Hoàn tất.`);
  log(`File mới:  ${outputFile}`);
  log(`Latest:    ${latestFile}`);
  log(`Dung lượng: ${formatBytes(size)}`);
}

main();
