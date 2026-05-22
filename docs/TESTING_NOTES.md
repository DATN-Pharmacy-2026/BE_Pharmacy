# Testing Notes

## 1. Smoke tests
```bash
npm run test:smoke
```
Uses `scripts/smoke/demo-smoke.sh` and expects running services.

## 2. Backend demo API tests
```bash
npm run test:demo
```
Demo specs:
- `apps/identity-service/test/auth.demo-spec.ts`
- `apps/commerce-service/test/commerce.demo-spec.ts`
- `apps/operation-service/test/operation.demo-spec.ts`
- `apps/reporting-setting-service/test/reporting-notification.demo-spec.ts`

These tests call running APIs via gateway.

Environment variables:
- `DEMO_API_BASE_URL` (default `http://localhost:3000`)
- `DEMO_ADMIN_USERNAME` (default `admin`)
- `DEMO_ADMIN_PASSWORD` (default `admin123`)

## 3. Playwright UI tests
```bash
cd ../UI-PHARMACY
npm run test:e2e
```

Useful:
```bash
npm run test:e2e:ui
npm run test:e2e:headed
```

Playwright assumptions:
- Frontend available on `http://localhost:4008` (current config)
- Gateway available on `http://localhost:3000`
- Seeded admin account exists

## 4. Reset test/demo data
```bash
npm run demo:reset
```
