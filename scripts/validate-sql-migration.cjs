// Validate Postgres SQL syntax using real Postgres parser (libpg-query via WASM).
// Usage: node scripts/validate-sql-migration.cjs <path-to-sql>
const fs = require("node:fs");
const path = require("node:path");

const targetFile = process.argv[2];
if (!targetFile) {
  console.error("Usage: node validate-sql-migration.cjs <path-to-sql>");
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(targetFile), "utf-8");

async function main() {
  const mod = require("pg-query-emscripten");
  const factory = mod.default ?? mod;
  const pg = await factory();
  const result = pg.parse(sql);
  if (result.error) {
    console.error("[FAIL] SQL parse error:");
    console.error(result.error);
    process.exit(1);
  }
  const stmtCount = result.parse_tree?.stmts?.length ?? 0;
  console.log(`[OK] Parsed ${stmtCount} statements without syntax errors.`);
  // Print statement kinds for quick visual check
  const kinds = (result.parse_tree?.stmts ?? []).map((s) => Object.keys(s.stmt ?? {})[0]);
  const counts = kinds.reduce((acc, k) => ({ ...acc, [k]: (acc[k] ?? 0) + 1 }), {});
  console.log("[INFO] Statement kinds:", counts);
}

main().catch((err) => {
  console.error("[FAIL]", err);
  process.exit(1);
});
