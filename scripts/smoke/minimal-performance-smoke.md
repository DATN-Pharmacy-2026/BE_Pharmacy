# Minimal Performance Smoke

1. Build:
```bash
npm run build:all
```

2. Product list pagination and sort:
```http
GET /api/products?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

3. Product search (bounded query):
```http
GET /api/products?search=paracetamol&page=1&limit=20
```

4. Order list pagination:
```http
GET /api/orders?page=1&limit=20
```

5. Inventory list pagination:
```http
GET /api/inventory?page=1&limit=20
```

6. Audit logs summary list:
```http
GET /api/audit-logs?page=1&limit=20
```
Expected: no heavy `beforeData`/`afterData` in list items.

7. Notification event summary list:
```http
GET /api/notification-events?page=1&limit=20
```
Expected: no large `payload` in list items.

8. Payment gateway transactions list:
```http
GET /api/payment-gateways/transactions?page=1&limit=20
```

9. Invalid limit check:
```http
GET /api/products?page=1&limit=1000
```
Expected: validation error.

10. Invalid sort field check:
```http
GET /api/products?sortBy=unsafeField
```
Expected: `400 Invalid sort field`.

11. Unknown DTO field check:
```http
GET /api/products?page=1&limit=20&unexpected=1
```
Expected: rejected by validation pipeline.
