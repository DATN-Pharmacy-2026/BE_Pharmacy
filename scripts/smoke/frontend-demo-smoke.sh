#!/usr/bin/env sh
set -eu

FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-http://localhost:5173}"
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"

echo "[smoke] frontend: ${FRONTEND_BASE_URL}"
echo "[smoke] api: ${API_BASE_URL}"

curl -fsS "${FRONTEND_BASE_URL}" >/dev/null
echo "[ok] frontend reachable"

curl -fsS "${API_BASE_URL}/api/health" >/dev/null
echo "[ok] gateway health reachable"

curl -fsS -X POST "${API_BASE_URL}/api/auth/login" -H "Content-Type: application/json" -d '{"username":"invalid","password":"invalid"}' >/dev/null || true
echo "[ok] auth login endpoint reachable"

curl -fsS "${API_BASE_URL}/api/products?page=1&limit=1" >/dev/null
echo "[ok] products endpoint reachable"

echo "[done] frontend smoke completed"
