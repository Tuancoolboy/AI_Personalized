#!/usr/bin/env bash
# Deploy production lên Vercel và gán alias c2-app-009.vercel.app
#
# Cách dùng (từ thư mục gốc repo):
#   ./scripts/deploy-vercel-prod.sh
#
# Tuỳ chọn:
#   SKIP_BUILD=1 ./scripts/deploy-vercel-prod.sh   # bỏ npm run build
#   PRODUCTION_ALIAS=ten-khac.vercel.app ./scripts/deploy-vercel-prod.sh
#   DEPLOY_WAIT_TIMEOUT=900 ./scripts/deploy-vercel-prod.sh   # chờ Ready tối đa 15 phút

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PRODUCTION_ALIAS="${PRODUCTION_ALIAS:-c2-app-009.vercel.app}"
LEGACY_ALIAS="${LEGACY_ALIAS:-ai-tro-ly.vercel.app}"
SKIP_BUILD="${SKIP_BUILD:-0}"
DEPLOY_WAIT_TIMEOUT="${DEPLOY_WAIT_TIMEOUT:-600}"
DEPLOY_POLL_INTERVAL="${DEPLOY_POLL_INTERVAL:-5}"
PROMOTE_TIMEOUT="${PROMOTE_TIMEOUT:-5m}"

fetch_ready_state() {
  local deploy_url="$1"
  vercel inspect "$deploy_url" --format json 2>&1 | node -e "
    const raw = require('fs').readFileSync(0, 'utf8');
    const start = raw.indexOf('{');
    if (start < 0) process.exit(2);
    const data = JSON.parse(raw.slice(start));
    process.stdout.write(String(data.readyState || 'UNKNOWN'));
  "
}

wait_for_deployment_ready() {
  local deploy_url="$1"
  local elapsed=0
  local state=""

  echo "▶ Chờ deployment Ready (tối đa ${DEPLOY_WAIT_TIMEOUT}s, poll ${DEPLOY_POLL_INTERVAL}s)..."
  while (( elapsed < DEPLOY_WAIT_TIMEOUT )); do
    if ! state="$(fetch_ready_state "$deploy_url")"; then
      echo "   ⚠ Không đọc được trạng thái — thử lại..."
      sleep "$DEPLOY_POLL_INTERVAL"
      elapsed=$((elapsed + DEPLOY_POLL_INTERVAL))
      continue
    fi

    case "$state" in
      READY)
        echo "   ✓ Ready sau ${elapsed}s"
        return 0
        ;;
      ERROR|CANCELED)
        echo "   ❌ Deployment $state — xem log bên dưới:"
        vercel inspect "$deploy_url" --logs 2>&1 | tail -40 || true
        return 1
        ;;
      *)
        echo "   … ${state} (${elapsed}s / ${DEPLOY_WAIT_TIMEOUT}s)"
        sleep "$DEPLOY_POLL_INTERVAL"
        elapsed=$((elapsed + DEPLOY_POLL_INTERVAL))
        ;;
    esac
  done

  echo "   ❌ Hết thời gian chờ (trạng thái cuối: ${state:-UNKNOWN})"
  echo "   Kiểm tra trên Vercel Dashboard → Deployments"
  return 1
}

assign_production_alias() {
  local deploy_url="$1"

  echo "▶ Promote deployment lên production (gán domain production)..."
  if vercel promote "$deploy_url" -y --timeout "$PROMOTE_TIMEOUT"; then
    echo "   ✓ Promote thành công"
    return 0
  fi

  echo "   ⚠ Promote thất bại — thử gán alias $PRODUCTION_ALIAS thủ công..."
  if vercel alias set "$deploy_url" "$PRODUCTION_ALIAS"; then
    echo "   ✓ Alias set thành công"
    return 0
  fi

  echo ""
  echo "❌ Không gán được domain production."
  echo "   Deployment đã Ready tại: $deploy_url"
  echo "   Thử một trong các cách sau:"
  echo "   1. Vercel Dashboard → Deployments → chọn deployment → Promote to Production"
  echo "   2. Owner team: vercel alias set $deploy_url $PRODUCTION_ALIAS"
  echo "   3. Dùng tạm URL deployment ở trên"
  return 1
}

echo "=== Deploy Vercel Production: c2-app-009 ==="
echo "Thư mục: $ROOT"
echo "Alias production: $PRODUCTION_ALIAS"
echo ""

if ! command -v vercel >/dev/null 2>&1; then
  echo "❌ Chưa có Vercel CLI. Cài bằng: npm install -g vercel"
  exit 1
fi

if [[ ! -f .vercel/project.json ]]; then
  echo "❌ Chưa link project Vercel (.vercel/project.json không tồn tại)."
  echo "   Chạy một lần trong thư mục gốc: vercel link"
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "▶ Cài dependencies..."
  npm install
fi

if [[ "$SKIP_BUILD" != "1" ]]; then
  echo "▶ Kiểm tra build local (npm run build)..."
  npm run build
  echo ""
else
  echo "▶ Bỏ qua build local (SKIP_BUILD=1)"
  echo ""
fi

echo "▶ Upload + build trên Vercel (--skip-domain, chờ promote sau khi Ready)..."
DEPLOY_OUTPUT="$(vercel deploy --prod --format json --skip-domain --yes --no-wait 2>&1)"
printf '%s\n' "$DEPLOY_OUTPUT"

DEPLOY_URL="$(printf '%s' "$DEPLOY_OUTPUT" | node "$ROOT/scripts/vercel-cli-json.mjs" deployment.url)"
DEPLOY_ID="$(printf '%s' "$DEPLOY_OUTPUT" | node "$ROOT/scripts/vercel-cli-json.mjs" deployment.id)"

echo "   Deployment: $DEPLOY_URL"
if [[ -n "$DEPLOY_ID" ]]; then
  echo "   ID: $DEPLOY_ID"
fi
echo ""

wait_for_deployment_ready "$DEPLOY_URL"
assign_production_alias "$DEPLOY_URL"

echo ""
echo "▶ Gỡ alias legacy nếu còn tồn tại:"
vercel alias rm "$LEGACY_ALIAS" -y >/dev/null 2>&1 || true
echo "   ✓ Không dùng https://$LEGACY_ALIAS"

echo ""
echo "▶ Xác nhận alias:"
vercel alias list 2>/dev/null | grep -F "$PRODUCTION_ALIAS" || vercel alias list

echo ""
echo "✅ Xong!"
echo "   Production: https://$PRODUCTION_ALIAS"
echo "   Deployment: $DEPLOY_URL"
