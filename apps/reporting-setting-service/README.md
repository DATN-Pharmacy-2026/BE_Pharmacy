# Reporting Setting Service

Owns settings, audit logs, report jobs and KPI/dashboard snapshots.

## Run
```bash
npm run start:reporting
```

## Health
- `GET /health`
- `GET /api/health`

## Swagger
- `GET /docs`

## Prisma Schema
- `prisma/reporting/schema.prisma`

## Settings
- `GET /api/settings`
- `GET /api/settings/:id`
- `GET /api/settings/key/:key`
- `GET /api/settings/effective/:key`
- `POST /api/settings`
- `PATCH /api/settings/:id`
- `PATCH /api/settings/key/:key`
- `DELETE /api/settings/:id`

## Audit Logs
- `GET /api/audit-logs`
- `GET /api/audit-logs/:id`
- `GET /api/audit-logs/entity/:entityType/:entityId`
- `GET /api/audit-logs/user/:actorUserId`
- `POST /api/audit-logs`

## Dashboard
- `GET /api/dashboard/overview`
- `GET /api/dashboard/snapshots`
- `GET /api/dashboard/snapshots/:id`
- `POST /api/dashboard/snapshots`

## KPIs
- `GET /api/kpis`
- `GET /api/kpis/:id`
- `GET /api/kpis/metric/:metricCode`
- `POST /api/kpis`
- `POST /api/kpis/bulk`

## Reports
- `GET /api/reports`
- `GET /api/reports/:id`
- `POST /api/reports`
- `PATCH /api/reports/:id/status`
- `POST /api/reports/:id/process`
- `GET /api/reports/types`
- `GET /api/reports/summary`

## Report Exports
- `GET /api/report-exports`
- `GET /api/report-exports/:id`
- `GET /api/report-exports/report/:reportJobId`
- `POST /api/report-exports`
- `POST /api/report-exports/generate/:reportJobId`
- `GET /api/report-exports/:id/download`

## Notification Events
- `GET /api/notification-events`
- `GET /api/notification-events/:id`
- `POST /api/notification-events`
- `POST /api/notification-events/publish`
- `PATCH /api/notification-events/:id/read`
- `PATCH /api/notification-events/read-all`
- `GET /api/notification-events/unread-count`
- `DELETE /api/notification-events/:id`

## Notification Delivery
- `GET /api/notification-delivery/attempts`
- `GET /api/notification-delivery/attempts/:id`
- `POST /api/notification-delivery/events/:notificationEventId/deliver`
- `POST /api/notification-delivery/test`

## Notification Preferences
- `GET /api/notification-preferences`
- `GET /api/notification-preferences/:id`
- `POST /api/notification-preferences`
- `PATCH /api/notification-preferences/:id`
- `DELETE /api/notification-preferences/:id`
- `POST /api/notification-preferences/resolve`

## Notification Templates
- `GET /api/notification-templates`
- `GET /api/notification-templates/:id`
- `POST /api/notification-templates`
- `PATCH /api/notification-templates/:id`
- `DELETE /api/notification-templates/:id`
- `POST /api/notification-templates/render`
- `POST /api/notification-templates/seed-defaults`

## Event Debug (Service-Direct)
- `GET /api/events/health`
- `GET /api/events/outbox`
- `GET /api/events/inbox`
- `POST /api/events/outbox/:id/publish`
- `POST /api/events/publish-test` (disabled unless `EVENT_TEST_ENDPOINT_ENABLED=true`)

## WebSocket
- Namespace/path: `/notifications`
- Rooms:
  - `user:{userId}`
  - `branch:{branchId}`
  - `warehouse:{warehouseId}`
- Emitted events:
  - `notification.event`
  - `notification.delivered`
  - `notification.read`

## Notes
- Audit logs are append-only.
- Sensitive fields are masked before write and on read.
- `actorUserId`, `branchId`, and `warehouseId` are logical cross-service references only.
- Dashboard and KPI APIs use reporting snapshots/read models only.
- No direct cross-service queries are executed for KPI aggregation in this phase.
- Real aggregation should be event-driven and/or scheduled in a later phase.
- Reports foundation stores report jobs and JSON filters only in this phase.
- XLSX export uses ExcelJS.
- Export files are stored locally under `storage/report-exports` for development.
- Export generation uses reporting database only.
- No direct cross-service queries are executed for export generation.
- Unsupported report types generate a limitation sheet instead of fake data.
- Real report aggregation/export pipeline will be enhanced in later phases.
- Notification events are persisted in reporting-setting-service database.
- Notification foundation phase does not implement email delivery, websocket push, or external broker.
- Notification events are scoped by recipientUserId, branchId, and warehouseId.
- Email delivery uses Nodemailer provider foundation.
- Email is disabled by default for safe local development.
- Console email provider is supported for development preview.
- SMTP delivery can be enabled via env:
  - `NOTIFICATION_EMAIL_ENABLED`
  - `NOTIFICATION_EMAIL_PROVIDER`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- WebSocket delivery is foundation-level only.
- No external broker, retry, or DLQ is implemented in this phase.
- Notification preferences support user/branch/warehouse/channel/eventType scopes.
- Notification templates support safe placeholder interpolation with default locale `vi`.
- Missing template variables are handled safely as empty string values.
- Delivery checks preferences first and records `SKIPPED` attempts when blocked.
- Email/websocket delivery renders templates before send and falls back to original title/message on render issues.
- Gateway is the frontend entrypoint.
- No cross-service foreign keys or service-to-service calls are used.
- Event broker foundation uses outbox/inbox idempotency with correlation ID propagation.

## Phase 4 Integrated Flow
1. `POST /api/reports`
2. `POST /api/reports/:id/process`
3. `GET /api/report-exports/report/:reportJobId`
4. `GET /api/report-exports/:id/download`
5. `GET /api/notification-events`
6. `GET /api/notification-delivery/attempts`
7. `PATCH /api/notification-events/:id/read`

## Smoke
- `bash scripts/smoke-reporting-notification.sh`
- Preference blocked delivery sample:
```bash
curl -X POST http://localhost:3000/api/notification-preferences \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"userId":"<recipientUserId>","eventType":"REPORT_EXPORT_COMPLETED","channel":"IN_APP","enabled":false}'
```

## Ownership
- Setting
- AuditLog
- ReportJob and ReportExport
- DashboardSnapshot and KPISnapshot

## Retry/DLQ
- Admin endpoints: /api/reporting-events/failures*, replay, resolve, ignore, retry policy evaluate.
- Failed events are stored in EventFailure, replay actions in EventReplayAudit.
