# Pharmacy ERP + Ecommerce + POS (Final Thesis Demo)

This repository contains the backend microservices for the Pharmacy platform. Frontend is in `../UI-PHARMACY`.

## 1) Project Overview
- Multi-branch pharmacy platform with public ecommerce, admin backoffice, POS, reporting, and notifications.
- Microservice architecture behind a single API Gateway.
- Frontend must call API Gateway only.

## 2) Main Features
- Identity and RBAC with branch/warehouse scope.
- Product/catalog, cart, checkout, order, payment foundation.
- Inventory, batches, goods receipt, stock transfer, POS, receipts.
- Reports, report export, audit logs, settings, notification foundation.
- Event-bus/outbox/inbox foundation with retry + DLQ scaffolding.

## 3) Architecture
See [docs/ARCHITECTURE_OVERVIEW.md](./docs/ARCHITECTURE_OVERVIEW.md).

## 4) Services and Ports
| Service | Port | Responsibility |
|---|---:|---|
| API Gateway | 3000 | Frontend API entrypoint and proxy |
| Identity Service | 3001 | Auth, RBAC, user scope |
| Commerce Service | 3002 | Product, cart, checkout, order, payment |
| Operation Service | 3003 | Branch, warehouse, inventory, POS, receipt |
| Reporting Setting Service | 3004 | Report, export, audit, settings, notification |
| Notification Service | 3005 | Notification runtime foundation |
| Frontend (UI-PHARMACY) | 5173 | React UI |

## 5) Database Ownership
- `pharmacy_identity` -> identity-service
- `pharmacy_commerce` -> commerce-service
- `pharmacy_operation` -> operation-service
- `pharmacy_reporting` -> reporting-setting-service
- `pharmacy_notification` -> notification-service

No cross-service FK is allowed; cross-service references use UUID fields.

## 6) Prerequisites
- Node.js 20+
- npm
- Docker + Docker Compose
- Bash shell for smoke scripts (Git Bash/WSL on Windows)

## 7) Environment Setup
```bash
cp .env.example .env
cp ../UI-PHARMACY/.env.example ../UI-PHARMACY/.env
```

Required env examples:
- `.env.example`
- `apps/gateway/.env.example`
- `apps/identity-service/.env.example`
- `apps/commerce-service/.env.example`
- `apps/operation-service/.env.example`
- `apps/reporting-setting-service/.env.example`
- `apps/notification-service/.env.example`
- `../UI-PHARMACY/.env.example`

## 8) Docker Compose Setup
```bash
docker compose up -d
docker compose ps
```

Compose includes:
- PostgreSQL
- pgAdmin
- RabbitMQ (management UI)

## 9) Prisma Generate / Migrate / Seed
```bash
npm run prisma:generate:identity
npm run prisma:generate:commerce
npm run prisma:generate:operation
npm run prisma:generate:reporting
npm run prisma:generate:notification

npm run prisma:migrate:identity
npm run prisma:migrate:commerce
npm run prisma:migrate:operation
npm run prisma:migrate:reporting
npm run prisma:migrate:notification

npm run prisma:seed:all
```

Convenience:
```bash
npm run prisma:generate:all
npm run prisma:migrate:all
```

## 10) Start Backend Services
```bash
npm run start:gateway
npm run start:identity
npm run start:commerce
npm run start:operation
npm run start:reporting
npm run start:notification
```

All dev watchers:
```bash
npm run start:dev:all
```

## 11) Start Frontend
```bash
cd ../UI-PHARMACY
npm install
npm run dev
```

## 12) Demo Accounts (Seed)
- Admin: `admin` / `admin123`
- Cashier and customer should be provided by seed data in your environment; configure Playwright `E2E_*` vars.

## 13) Main Demo Flows
See:
- [docs/DEMO_GUIDE.md](./docs/DEMO_GUIDE.md)
- [docs/DEMO_SCRIPT_10_MINUTES.md](./docs/DEMO_SCRIPT_10_MINUTES.md)
- [docs/DEMO_CHECKLIST.md](./docs/DEMO_CHECKLIST.md)

## 14) Smoke Test Commands
```bash
npm run test:smoke
bash scripts/smoke/frontend-demo-smoke.sh
```

## 15) E2E Test Commands
```bash
npm run test:e2e
npm run test:e2e:demo
```

## 16) Swagger / API Docs
- Gateway: `http://localhost:3000/docs`
- Identity: `http://localhost:3001/docs`
- Commerce: `http://localhost:3002/docs`
- Operation: `http://localhost:3003/docs`
- Reporting: `http://localhost:3004/docs`
- Notification: `http://localhost:3005/docs`

Authorization header format:
```txt
Authorization: Bearer <access_token>
```

## 17) Payment Sandbox Notes
- VNPay/Momo/ZaloPay adapters exist with sandbox-oriented config.
- Signature verification and callback handlers are implemented.
- Production-grade payment operations and provider certification are future work.

## 18) Event / Notification Notes
- RabbitMQ foundation exists.
- Outbox/inbox and retry/DLQ scaffolding exist.
- Notification delivery is foundation-level for demo.

## 19) Troubleshooting
See [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md).

## 20) Known Limitations
See [docs/KNOWN_LIMITATIONS.md](./docs/KNOWN_LIMITATIONS.md).

## 21) Final Thesis / Demo Notes
- This package is demo-ready when services, seed data, smoke, and E2E demo checks pass locally.
- Use [docs/FINAL_SUBMISSION_CHECKLIST.md](./docs/FINAL_SUBMISSION_CHECKLIST.md) before submission.
