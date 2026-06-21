#!/usr/bin/env node
/**
 * Kiểm tra tên file trong supabase/migrations/.
 * Legacy: 0001–0012 (+ 0007b đã rename). Mới: YYYYMMDDHHMMSS_snake.sql
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

/** Nền Giai đoạn 1 — 0001_init … 0012_chat_memory */
const LEGACY_PATTERN = /^(000[1-9]|001[0-2])_[a-z0-9_]+\.sql$/i;
/** Supabase CLI chuẩn */
const TIMESTAMP_PATTERN = /^[0-9]{14}_[a-z0-9_]+\.sql$/;

function main() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const invalid = [];
  const numberedNew = [];

  for (const file of files) {
    if (LEGACY_PATTERN.test(file) || TIMESTAMP_PATTERN.test(file)) {
      if (/^00(1[3-9]|[2-9][0-9])_/i.test(file)) {
        numberedNew.push(file);
      }
      continue;
    }
    invalid.push(file);
  }

  let failed = false;

  if (invalid.length > 0) {
    failed = true;
    console.error("[db:validate] ✗ Tên file không hợp lệ:");
    for (const f of invalid) {
      console.error(`  - ${f}`);
    }
    console.error(
      "  → Dùng YYYYMMDDHHMMSS_<noi-dung>.sql hoặc legacy 0001–0012.",
    );
  }

  if (numberedNew.length > 0) {
    failed = true;
    console.error(
      "[db:validate] ✗ Phát hiện migration numbered mới (0013+ — đã bỏ):",
    );
    for (const f of numberedNew) {
      console.error(`  - ${f}`);
    }
    console.error(
      "  → Renumber sang timestamp. Xem .agents/rules/supabase-migrations.md",
    );
  }

  if (failed) {
    process.exit(1);
  }

  console.log(
    `[db:validate] ✓ ${files.length} migration file(s) — naming OK.`,
  );
}

main();
