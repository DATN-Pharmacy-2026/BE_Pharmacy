# Commerce Service

Owns ecommerce catalog and order domain.

## Commerce Core Overview
- Catalog: categories, brands, products, product images, product variants
- Cart + Checkout: carts, cart items, checkout
- Order lifecycle: online orders, order items, payments
- Engagement: reviews, coupons, coupon usages
- Cross-service fields (`userId`, `branchId`, `assignedWarehouseId`) are logical UUID references only.

## Run
```bash
npm run start:commerce
```

## Seed
```bash
npm run prisma:generate:commerce
npm run prisma:seed:commerce
```

## Health
- `GET /health`
- `GET /api/health` (through gateway)

## Prisma Schema
- `prisma/commerce/schema.prisma`

## Ownership
- Category, brand, product, variant, images
- Cart and cart items
- Online orders, items, payments
- Reviews, coupons, coupon usage

## Catalog Endpoints
Categories:
- `GET /api/categories`
- `POST /api/categories`
- `GET /api/categories/:id`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`

Brands:
- `GET /api/brands`
- `POST /api/brands`
- `GET /api/brands/:id`
- `PATCH /api/brands/:id`
- `DELETE /api/brands/:id`

Products:
- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `GET /api/products/sku/:sku`
- `GET /api/products/barcode/:barcode`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`

Product images:
- `POST /api/products/:productId/images`
- `DELETE /api/products/:productId/images/:imageId`

Product variants:
- `POST /api/products/:productId/variants`
- `PATCH /api/products/:productId/variants/:variantId`
- `DELETE /api/products/:productId/variants/:variantId`

Cart:
- `GET /api/carts/current`
- `POST /api/carts/items`
- `PATCH /api/carts/items/:itemId`
- `DELETE /api/carts/items/:itemId`
- `DELETE /api/carts/current`

Checkout:
- `POST /api/checkout`

Orders:
- `GET /api/orders`
- `GET /api/orders/my`
- `GET /api/orders/:id`
- `GET /api/orders/order-no/:orderNo`
- `PATCH /api/orders/:id/status`
- `PATCH /api/orders/:id/cancel`

Payments:
- `GET /api/payments`
- `GET /api/payments/:id`
- `GET /api/payments/order/:onlineOrderId`
- `PATCH /api/payments/:id/status`

Payment Gateway:
- `GET /api/payment-gateways/providers`
- `GET /api/payment-gateways/transactions`
- `GET /api/payment-gateways/transactions/:id`
- `POST /api/payment-gateways/initiate`
- `POST /api/payment-gateways/transactions/:id/sync`

VNPay:
- `GET /api/payment-gateways/vnpay/return`
- `GET /api/payment-gateways/vnpay/ipn`

MoMo:
- `GET /api/payment-gateways/momo/return`
- `POST /api/payment-gateways/momo/ipn`

ZaloPay:
- `GET /api/payment-gateways/zalopay/return`
- `POST /api/payment-gateways/zalopay/callback`

Reviews:
- `GET /api/reviews`
- `GET /api/reviews/:id`
- `GET /api/reviews/product/:productId`
- `POST /api/reviews`
- `PATCH /api/reviews/:id`
- `PATCH /api/reviews/:id/moderate`
- `DELETE /api/reviews/:id`

Coupons:
- `GET /api/coupons`
- `GET /api/coupons/:id`
- `GET /api/coupons/code/:code`
- `POST /api/coupons`
- `PATCH /api/coupons/:id`
- `DELETE /api/coupons/:id`
- `POST /api/coupons/validate`
- `GET /api/coupons/:id/usages`

Gateway examples:
- `GET http://localhost:3000/api/products`
- `GET http://localhost:3000/api/categories`
- `GET http://localhost:3000/api/brands`
- `GET http://localhost:3000/api/carts/current`
- `POST http://localhost:3000/api/carts/items`
- `POST http://localhost:3000/api/checkout`
- `GET http://localhost:3000/api/orders`
- `GET http://localhost:3000/api/payments`
- `GET http://localhost:3000/api/payment-gateways/providers`
- `GET http://localhost:3000/api/reviews`
- `GET http://localhost:3000/api/coupons`

Gateway forwarding expectations:
- `Authorization` header forwarded
- `x-request-id` forwarded
- `x-session-id` forwarded
- `x-branch-id` forwarded
- `x-warehouse-id` forwarded
- Gateway returns `503 Service unavailable` when commerce-service is down

Internal service dev URL:
- `http://localhost:3002/api/products`
- `http://localhost:3002/api/carts/current`
- `http://localhost:3002/api/checkout`

Swagger:
- Commerce service: `http://localhost:3002/docs`
- Gateway: `http://localhost:3000/docs`

## Smoke Test
Run local smoke flow via gateway:
```bash
sh scripts/smoke-commerce.sh
```

Optional environment overrides:
```bash
BASE_URL=http://localhost:3000/api \
SESSION_ID=smoke-session-123 \
AUTH_HEADER="Bearer <token>" \
sh scripts/smoke-commerce.sh
```

Notes:
- Cart does not check inventory availability yet.
- Inventory availability belongs to operation-service.
- `branchId` on cart is a logical cross-service reference only.
- Checkout does not allocate inventory yet.
- FEFO/inventory allocation belongs to operation-service.
- Order management does not allocate or deduct inventory.
- Fulfillment execution belongs to operation-service.
- Refund and payment provider integrations are not implemented yet.
- VNPay/MoMo/ZaloPay foundation is sandbox-first and disabled by default.
- Gateway is the frontend/provider entrypoint for return/callback URLs.
- Return URL is not final proof of payment.
- Verified callback/IPN is required before marking payment `PAID`.
- Duplicate callbacks are handled idempotently.
- Amount/order/payment identifiers are validated before status update.
- Provider secrets must be configured through env only.
- Refunds/payouts are not implemented in this task.
- Event broker/retry/DLQ are not implemented in this task.
- Checkout supports COD and MOCK flow only in this phase.
- Gateway is the frontend entrypoint.
- Coupon validation is commerce-only.
- Checkout integration for coupon usage can be implemented separately.
- No payment gateway integration yet.
- Inventory quantity is not part of Product, Cart, or Order in commerce-service.
- FEFO, inventory allocation, and stock deduction belong to operation-service.
- JWT/RBAC guards can be tightened further per route when permission seeds are finalized.

## Retry/DLQ Note
- Shared event retry/DLQ foundation is available via @app/event-bus; schema contains EventFailure and EventReplayAudit for consumer-side failure tracking.
