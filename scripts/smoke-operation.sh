#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api}"
TOKEN="${TOKEN:-}"
BRANCH_ID="${BRANCH_ID:-11111111-1111-1111-1111-111111111111}"
WAREHOUSE_ID="${WAREHOUSE_ID:-22222222-2222-2222-2222-222222222222}"
POS_TERMINAL_ID="${POS_TERMINAL_ID:-cccccccc-cccc-cccc-cccc-cccccccccccc}"
STORE_ID="${STORE_ID:-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb}"

if [[ -z "$TOKEN" ]]; then
  echo "Set TOKEN before running. Example: TOKEN=<jwt> bash scripts/smoke-operation.sh"
  exit 1
fi

HDR=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "x-branch-id: $BRANCH_ID" -H "x-warehouse-id: $WAREHOUSE_ID")

echo "1) List branches"
curl -sS "${HDR[@]}" "$BASE_URL/branches" | head -c 400; echo

echo "2) List warehouses"
curl -sS "${HDR[@]}" "$BASE_URL/warehouses" | head -c 400; echo

echo "3) List inventory"
curl -sS "${HDR[@]}" "$BASE_URL/inventory" | head -c 400; echo

echo "4) FEFO preview (requires seeded productId)"
curl -sS "${HDR[@]}" -X POST "$BASE_URL/fefo/preview" -d '{"productId":"00000000-0000-0000-0000-000000000001","warehouseId":"'"$WAREHOUSE_ID"'","quantity":1}' | head -c 400; echo

echo "5) Open POS session"
OPEN_RES=$(curl -sS "${HDR[@]}" -X POST "$BASE_URL/pos-sessions/open" -d '{"branchId":"'"$BRANCH_ID"'","storeId":"'"$STORE_ID"'","posTerminalId":"'"$POS_TERMINAL_ID"'","openingCash":100000}')
echo "$OPEN_RES" | head -c 400; echo
SESSION_ID=$(echo "$OPEN_RES" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n1)

echo "6) Verify POS sale readiness"
curl -sS "${HDR[@]}" -X POST "$BASE_URL/verification/pos-sale" -d '{"branchId":"'"$BRANCH_ID"'","storeId":"'"$STORE_ID"'","posTerminalId":"'"$POS_TERMINAL_ID"'","warehouseId":"'"$WAREHOUSE_ID"'","items":[{"productId":"00000000-0000-0000-0000-000000000001","quantity":1}]}' | head -c 400; echo

echo "7) Verify product availability"
curl -sS "${HDR[@]}" -X POST "$BASE_URL/verification/product-availability" -d '{"productId":"00000000-0000-0000-0000-000000000001","warehouseId":"'"$WAREHOUSE_ID"'","quantity":1}' | head -c 400; echo

echo "8) Close POS session (if opened)"
if [[ -n "$SESSION_ID" ]]; then
  curl -sS "${HDR[@]}" -X POST "$BASE_URL/pos-sessions/$SESSION_ID/close" -d '{"closingCash":100000}' | head -c 400; echo
fi

echo "Smoke run completed."
