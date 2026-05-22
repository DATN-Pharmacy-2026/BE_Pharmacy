# Notification Service

Owns notification templates, events and delivery logs.

## Run
```bash
npm run start:notification
```

## Health
- `GET /health`

## Prisma Schema
- `prisma/notification/schema.prisma`

## Ownership
- NotificationTemplate and NotificationPreference
- NotificationEvent
- NotificationLog, EmailLog, WebSocketEvent, SMSLog
