# Demo Smoke

Run after backend services and DB are up.

```bash
npm run test:smoke
```

Environment variables:

- `API_BASE_URL` default `http://localhost:3000`
- `DEMO_ADMIN_USERNAME` default `admin`
- `DEMO_ADMIN_PASSWORD` default `admin123`
- `DEMO_BRANCH_ID` default `11111111-1111-1111-1111-111111111111`
- `DEMO_WAREHOUSE_ID` default `22222222-2222-2222-2222-222222222222`

What it checks:

1. Gateway + direct service health endpoints.
2. Login and access-token extraction.
3. Product, inventory, order, report, notification, audit list endpoints.
4. Basic security checks:
   - protected route without token should reject
   - unknown DTO field should be rejected
