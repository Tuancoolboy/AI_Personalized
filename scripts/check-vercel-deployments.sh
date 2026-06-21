#!/usr/bin/env bash
# Xem deployment gần đây trên Vercel — phân biệt Git auto-deploy vs CLI.
#
# Cách dùng (từ thư mục gốc repo):
#   ./scripts/check-vercel-deployments.sh
#   ./scripts/check-vercel-deployments.sh 10   # số dòng hiển thị

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LIMIT="${1:-8}"
PROJECT="${VERCEL_PROJECT:-c2-app-009}"

if ! command -v vercel >/dev/null 2>&1; then
  echo "❌ Chưa có Vercel CLI. Cài: npm install -g vercel"
  exit 1
fi

if [[ ! -f .vercel/project.json ]]; then
  echo "❌ Chưa link Vercel (.vercel/project.json). Chạy: vercel link"
  exit 1
fi

echo "=== Vercel deployments: $PROJECT (mới nhất trước) ==="
echo ""
echo "Nguồn:"
echo "  git  = push lên GitHub → Vercel Git Integration tự build/deploy"
echo "  cli  = vercel deploy từ máy local (không gắn commit GitHub)"
echo ""
echo "Dashboard: https://vercel.com → Project → Deployments"
echo ""

vercel ls "$PROJECT" -F json 2>&1 | node -e "
const limit = Number(process.argv[1] || 8);
const raw = require('fs').readFileSync(0, 'utf8');
const start = raw.indexOf('{');
const end = raw.lastIndexOf('}');
if (start < 0) {
  console.error('Không đọc được JSON từ vercel ls');
  process.exit(1);
}
const data = JSON.parse(raw.slice(start, end + 1));
const rows = (data.deployments || []).slice(0, limit);

if (rows.length === 0) {
  console.log('Không có deployment nào.');
  process.exit(0);
}

console.log(
  ['STATE', 'TARGET', 'SOURCE', 'COMMIT/ACTOR', 'URL'].map((h) => h.padEnd(14)).join(' ')
);
console.log('-'.repeat(90));

for (const d of rows) {
  const gitSha = d.meta?.githubCommitSha;
  const gitRef = d.meta?.githubCommitRef;
  const source = gitSha ? 'git' : 'cli';
  const commit = gitSha
    ? gitSha.slice(0, 7) + '@' + (gitRef || '?')
    : (d.meta?.actor || d.creator?.username || '?');
  const url = d.url?.startsWith('http') ? d.url : 'https://' + (d.url || '');
  console.log(
    [
      String(d.readyState || d.state || '?').padEnd(14),
      String(d.target || '?').padEnd(14),
      source.padEnd(14),
      String(commit).slice(0, 24).padEnd(14),
      url,
    ].join(' ')
  );
}
" "$LIMIT"

echo ""
echo "Tip: GitHub Actions CI (lint/test/build) chạy trên GitHub, không phải Vercel."
echo "     Xem: https://github.com/AI20K-Build-Cohort-2/C2-App-009/actions"
