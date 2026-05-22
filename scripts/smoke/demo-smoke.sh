#!/usr/bin/env sh
set -eu

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
DEMO_ADMIN_USERNAME="${DEMO_ADMIN_USERNAME:-admin}"
DEMO_ADMIN_PASSWORD="${DEMO_ADMIN_PASSWORD:-admin123}"
BRANCH_ID="${DEMO_BRANCH_ID:-11111111-1111-1111-1111-111111111111}"
WAREHOUSE_ID="${DEMO_WAREHOUSE_ID:-22222222-2222-2222-2222-222222222222}"

echo "== Demo smoke against ${API_BASE_URL} =="

check_get() {
  url="$1"
  name="$2"
  code=$(curl -sS -o /tmp/demo-smoke.out -w "%{http_code}" "$url")
  if [ "$code" -lt 200 ] || [ "$code" -ge 300 ]; then
    echo "[FAIL] ${name} -> HTTP ${code}"
    cat /tmp/demo-smoke.out
    exit 1
  fi
  echo "[OK] ${name}"
}

check_get "${API_BASE_URL}/api/health" "Gateway health"
check_get "http://localhost:3001/api/health" "Identity health"
check_get "http://localhost:3002/health" "Commerce health"
check_get "http://localhost:3003/health" "Operation health"
check_get "http://localhost:3004/health" "Reporting health"

echo "== Login =="
LOGIN_BODY=$(cat <<JSON
{"username":"${DEMO_ADMIN_USERNAME}","password":"${DEMO_ADMIN_PASSWORD}"}
JSON
)
LOGIN_RESP=$(curl -sS -X POST "${API_BASE_URL}/api/auth/login" -H "Content-Type: application/json" -d "$LOGIN_BODY")
TOKEN=$(printf "%s" "$LOGIN_RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const t=j.data?.accessToken||j.accessToken||'';process.stdout.write(t);}catch{process.stdout.write('')}})")
if [ -z "$TOKEN" ]; then
  echo "[FAIL] Login did not return access token"
  echo "$LOGIN_RESP"
  exit 1
fi
echo "[OK] Login"

auth_get() {
  path="$1"
  name="$2"
  code=$(curl -sS -o /tmp/demo-smoke.out -w "%{http_code}" "${API_BASE_URL}${path}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "x-branch-id: ${BRANCH_ID}" \
    -H "x-warehouse-id: ${WAREHOUSE_ID}")
  if [ "$code" -lt 200 ] || [ "$code" -ge 300 ]; then
    echo "[FAIL] ${name} -> HTTP ${code}"
    cat /tmp/demo-smoke.out
    exit 1
  fi
  echo "[OK] ${name}"
}

auth_get "/api/auth/me" "Auth me"
auth_get "/api/products?page=1&limit=20" "Product list"
auth_get "/api/carts" "Cart summary"
auth_get "/api/orders?page=1&limit=20" "Order list"
auth_get "/api/inventory?page=1&limit=20" "Inventory list"
auth_get "/api/pos-orders?page=1&limit=20" "POS order list"
auth_get "/api/receipts?page=1&limit=20" "Receipt list"
auth_get "/api/reports?page=1&limit=20" "Report list"
auth_get "/api/report-exports?page=1&limit=20" "Report export list"
auth_get "/api/notification-events?page=1&limit=20" "Notification list"
auth_get "/api/audit-logs?page=1&limit=20" "Audit log list"

echo "Demo smoke completed."
