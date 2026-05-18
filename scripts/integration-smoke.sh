#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

# Prefer Windows curl when available (WSL/Git Bash -> Windows localhost services).
if command -v curl.exe >/dev/null 2>&1; then
  CURL_BIN="curl.exe"
else
  CURL_BIN="curl"
fi

echo "[1/6] GET /health"
"$CURL_BIN" -fsS "$API_BASE_URL/health" > /dev/null

echo "[2/6] POST /auth/login"
LOGIN_JSON=$("$CURL_BIN" -fsS -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(printf '%s' "$LOGIN_JSON" | sed -n 's/.*"accessToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
if [[ -z "$TOKEN" ]]; then
  TOKEN=$(printf '%s' "$LOGIN_JSON" | sed -n 's/.*"data"[^{]*{[^}]*"accessToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
fi

if [[ -z "$TOKEN" ]]; then
  echo "Could not parse accessToken from login response"
  echo "$LOGIN_JSON"
  exit 1
fi

echo "[3/6] GET /auth/me"
"$CURL_BIN" -fsS "$API_BASE_URL/auth/me" -H "Authorization: Bearer $TOKEN" > /dev/null

echo "[4/6] Commerce"
"$CURL_BIN" -fsS "$API_BASE_URL/products" -H "Authorization: Bearer $TOKEN" > /dev/null
"$CURL_BIN" -fsS "$API_BASE_URL/categories" -H "Authorization: Bearer $TOKEN" > /dev/null
"$CURL_BIN" -fsS "$API_BASE_URL/brands" -H "Authorization: Bearer $TOKEN" > /dev/null

echo "[5/6] Operation"
"$CURL_BIN" -fsS "$API_BASE_URL/branches" -H "Authorization: Bearer $TOKEN" > /dev/null
"$CURL_BIN" -fsS "$API_BASE_URL/warehouses" -H "Authorization: Bearer $TOKEN" > /dev/null
"$CURL_BIN" -fsS "$API_BASE_URL/inventory" -H "Authorization: Bearer $TOKEN" > /dev/null

echo "[6/6] Gateway docs routes"
"$CURL_BIN" -fsS "$API_BASE_URL/docs/gateway/routes" -H "Authorization: Bearer $TOKEN" > /dev/null

echo "Integration smoke passed."
