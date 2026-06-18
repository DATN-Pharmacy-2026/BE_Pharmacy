#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api}"
SESSION_ID="${SESSION_ID:-smoke-session-001}"
REQUEST_ID="${REQUEST_ID:-smoke-req-001}"
BRANCH_ID="${BRANCH_ID:-11111111-1111-1111-1111-111111111111}"
WAREHOUSE_ID="${WAREHOUSE_ID:-22222222-2222-2222-2222-222222222222}"
AUTH_HEADER="${AUTH_HEADER:-}"

COMMON_HEADERS=(
  -H "Content-Type: application/json"
  -H "x-session-id: ${SESSION_ID}"
  -H "x-request-id: ${REQUEST_ID}"
  -H "x-branch-id: ${BRANCH_ID}"
  -H "x-warehouse-id: ${WAREHOUSE_ID}"
)

if [[ -n "${AUTH_HEADER}" ]]; then
  COMMON_HEADERS+=( -H "Authorization: ${AUTH_HEADER}" )
fi

echo "[1] List categories"
curl -sS "${BASE_URL}/categories" "${COMMON_HEADERS[@]}" >/dev/null

echo "[2] List brands"
curl -sS "${BASE_URL}/brands" "${COMMON_HEADERS[@]}" >/dev/null

echo "[3] List products"
PRODUCT_ID=$(curl -sS "${BASE_URL}/products" "${COMMON_HEADERS[@]}" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n1)
if [[ -z "${PRODUCT_ID}" ]]; then
  echo "No product found. Seed commerce data first: npm run prisma:seed:commerce"
  exit 1
fi

echo "[4] Add product to cart"
curl -sS -X POST "${BASE_URL}/carts/items" "${COMMON_HEADERS[@]}" \
  -d "{\"productId\":\"${PRODUCT_ID}\",\"quantity\":1}" >/dev/null

echo "[5] Get current cart"
CART_JSON=$(curl -sS "${BASE_URL}/carts/current" "${COMMON_HEADERS[@]}")

echo "[6] Validate coupon"
curl -sS -X POST "${BASE_URL}/coupons/validate" "${COMMON_HEADERS[@]}" \
  -d '{"code":"WELCOME10","orderAmount":200000}' >/dev/null

echo "[7] Checkout cart"
CHECKOUT_JSON=$(curl -sS -X POST "${BASE_URL}/checkout" "${COMMON_HEADERS[@]}" \
  -d '{"sessionId":"'"${SESSION_ID}"'","customerName":"Smoke User","customerPhone":"0900000000","shippingAddress":"123 Smoke Street","paymentMethod":"COD","couponCode":"WELCOME10"}')
ORDER_ID=$(echo "${CHECKOUT_JSON}" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n1)

echo "[8] List orders"
curl -sS "${BASE_URL}/orders" "${COMMON_HEADERS[@]}" >/dev/null

if [[ -n "${ORDER_ID}" ]]; then
  echo "[9] Get order detail"
  curl -sS "${BASE_URL}/orders/${ORDER_ID}" "${COMMON_HEADERS[@]}" >/dev/null
fi

echo "[10] List payments"
curl -sS "${BASE_URL}/payments" "${COMMON_HEADERS[@]}" >/dev/null

echo "[11] Create review"
curl -sS -X POST "${BASE_URL}/reviews" "${COMMON_HEADERS[@]}" \
  -d "{\"productId\":\"${PRODUCT_ID}\",\"rating\":5,\"content\":\"Smoke test review\",\"userId\":\"33333333-3333-3333-3333-333333333333\"}" >/dev/null || true

echo "[12] List product reviews"
curl -sS "${BASE_URL}/reviews/product/${PRODUCT_ID}" "${COMMON_HEADERS[@]}" >/dev/null

echo "Smoke commerce flow completed successfully."
