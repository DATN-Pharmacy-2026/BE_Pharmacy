#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

echo "[1/7] Seed default notification templates"
curl -fsS -X POST "$API_BASE_URL/notification-templates/seed-defaults" >/dev/null

echo "[2/7] Login"
LOGIN_JSON=$(curl -fsS -X POST "$API_BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")
TOKEN=$(printf "%s" "$LOGIN_JSON" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
if [ -z "${TOKEN:-}" ]; then
  echo "Failed to get access token"
  exit 1
fi
AUTH=(-H "Authorization: Bearer $TOKEN")

echo "[3/7] Create report job"
JOB_JSON=$(curl -fsS -X POST "$API_BASE_URL/reports" "${AUTH[@]}" -H "Content-Type: application/json" -d '{"reportType":"SALES_SUMMARY","filters":{"dateFrom":"2026-05-01","dateTo":"2026-05-17"}}')
JOB_ID=$(printf "%s" "$JOB_JSON" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')

if [ -z "${JOB_ID:-}" ]; then
  echo "Failed to create report job"
  exit 1
fi

echo "[4/7] Process report"
curl -fsS -X POST "$API_BASE_URL/reports/$JOB_ID/process" "${AUTH[@]}" -H "Content-Type: application/json" -d '{"deliverNotification":true}' >/dev/null

echo "[5/7] Verify report exports"
EXPORTS_JSON=$(curl -fsS "$API_BASE_URL/report-exports/report/$JOB_ID" "${AUTH[@]}")
EXPORT_ID=$(printf "%s" "$EXPORTS_JSON" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')

if [ -z "${EXPORT_ID:-}" ]; then
  echo "No export created"
  exit 1
fi

echo "[6/7] Verify notifications and delivery attempts"
EVENTS_JSON=$(curl -fsS "$API_BASE_URL/notification-events?sourceEntityId=$EXPORT_ID" "${AUTH[@]}")
EVENT_ID=$(printf "%s" "$EVENTS_JSON" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
if [ -n "${EVENT_ID:-}" ]; then
  curl -fsS "$API_BASE_URL/notification-delivery/attempts?notificationEventId=$EVENT_ID" "${AUTH[@]}" >/dev/null
fi

echo "[7/7] Render template sample"
curl -fsS -X POST "$API_BASE_URL/notification-templates/render" "${AUTH[@]}" -H "Content-Type: application/json" -d '{"eventType":"REPORT_EXPORT_COMPLETED","channel":"IN_APP","locale":"vi","context":{"reportType":"SALES_SUMMARY","downloadUrl":"/api/report-exports/example/download"}}' >/dev/null

echo "Reporting/Notification smoke passed"
