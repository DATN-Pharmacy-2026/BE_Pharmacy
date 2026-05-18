# TROUBLESHOOTING

## 1) CORS error on login from frontend
Symptom: Browser says no `Access-Control-Allow-Origin` for `/api/auth/login`.
Fix:
- Ensure gateway allows `http://localhost:4008` in `CORS_ORIGINS`.
- Restart gateway.

## 2) `identity-service` login unavailable via gateway (503)
Symptom: `POST /api/auth/login` returns `503 Service unavailable`.
Fix:
- Verify identity service is up at `:3001`.
- Check `IDENTITY_SERVICE_URL` in backend env.

## 3) `commerce-service` startup fails
Symptom: Nest DI error for `EventPublisherService` in `PaymentGatewaysModule`.
Fix:
- Import/export provider module correctly in `PaymentGatewaysModule`.
- Rebuild and restart commerce service.

## 4) `prisma:generate:reporting` EPERM on Windows
Symptom: EPERM rename `query_engine-windows.dll.node`.
Fix:
- Close processes locking prisma engine (node/IDE).
- Retry command.

## 5) Smoke script fails on Windows
Symptom: `'sh' is not recognized` for `npm run test:smoke`.
Fix:
- Run in Git Bash/WSL, or provide a PowerShell smoke script variant.

## 6) Playwright login fails
Symptom: E2E stuck on `/login`.
Fix:
- Check CORS first.
- Verify admin seed account exists (`admin/admin123`).
- Verify identity + gateway are both running.
