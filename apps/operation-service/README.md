# Operation Service

Owns branch/store/warehouse/inventory/POS/procurement domain.

## Run
```bash
npm run start:operation
```

## Health
- `GET /health`
- `GET /api/health` (through gateway)

## Prisma Schema
- `prisma/operation/schema.prisma`

## Ownership
- Company, branch, store, warehouse, location
- POS terminal/session/order/payment/receipt
- Supplier, purchase order, goods receipt
- Batch, inventory item, stock movement/adjustment/transfer/shipment
- FEFO allocation and barcode verification

## Operation Foundation APIs
Companies:
- `GET /api/companies`
- `POST /api/companies`

Branches:
- `GET /api/branches`
- `GET /api/branches/code/:code`
- `POST /api/branches`

Stores:
- `GET /api/stores`
- `GET /api/stores/code/:code`
- `POST /api/stores`

Warehouses:
- `GET /api/warehouses`
- `GET /api/warehouses/code/:code`
- `POST /api/warehouses`

Warehouse Locations:
- `GET /api/warehouses/:warehouseId/locations`
- `POST /api/warehouses/:warehouseId/locations`

POS Terminals:
- `GET /api/pos-terminals`
- `POST /api/pos-terminals`

POS Sessions:
- `GET /api/pos-sessions`
- `GET /api/pos-sessions/:id`
- `GET /api/pos-sessions/current`
- `POST /api/pos-sessions/open`
- `POST /api/pos-sessions/:id/close`

POS Orders:
- `GET /api/pos-orders`
- `GET /api/pos-orders/:id`
- `GET /api/pos-orders/order-no/:orderNo`
- `GET /api/pos-orders/session/:posSessionId`
- `POST /api/pos-orders`
- `PATCH /api/pos-orders/:id/status`
- `POST /api/pos-orders/:id/refund`

POS Payments:
- `GET /api/pos-payments`
- `GET /api/pos-payments/:id`
- `GET /api/pos-payments/order/:posOrderId`
- `PATCH /api/pos-payments/:id/status`

Receipts:
- `GET /api/receipts`
- `GET /api/receipts/:id`
- `GET /api/receipts/receipt-no/:receiptNo`
- `GET /api/receipts/pos-order/:posOrderId`
- `GET /api/receipts/online-order/:onlineOrderId`
- `GET /api/receipts/:id/print-data`
- `POST /api/receipts`
- `POST /api/receipts/from-pos-order/:posOrderId`
- `POST /api/receipts/from-online-order/:onlineOrderId`
- `POST /api/receipts/:id/reissue`
- `POST /api/receipts/:id/void`

Verification:
- `POST /api/verification/barcode`
- `POST /api/verification/product-availability`
- `POST /api/verification/pos-sale`
- `GET /api/verification/history`
- `GET /api/verification/history/:id`

Inventory:
- `GET /api/inventory`
- `GET /api/inventory/:id`
- `GET /api/inventory/product/:productId`
- `GET /api/inventory/warehouse/:warehouseId`
- `GET /api/inventory/low-stock`
- `GET /api/inventory/expiring`

Suppliers:
- `GET /api/suppliers`
- `GET /api/suppliers/:id`
- `GET /api/suppliers/code/:code`
- `POST /api/suppliers`
- `PATCH /api/suppliers/:id`
- `DELETE /api/suppliers/:id`

Purchase Orders:
- `GET /api/purchase-orders`
- `GET /api/purchase-orders/:id`
- `GET /api/purchase-orders/po-no/:poNo`
- `POST /api/purchase-orders`
- `PATCH /api/purchase-orders/:id`
- `PATCH /api/purchase-orders/:id/status`
- `DELETE /api/purchase-orders/:id`

Batches:
- `GET /api/batches`
- `GET /api/batches/:id`
- `GET /api/batches/product/:productId`
- `POST /api/batches`
- `PATCH /api/batches/:id`
- `DELETE /api/batches/:id`

Goods Receipts:
- `GET /api/goods-receipts`
- `GET /api/goods-receipts/:id`
- `GET /api/goods-receipts/receipt-no/:receiptNo`
- `POST /api/goods-receipts`
- `PATCH /api/goods-receipts/:id`
- `PATCH /api/goods-receipts/:id/status`
- `DELETE /api/goods-receipts/:id`
- `POST /api/goods-receipts/:id/post-inventory`

Stock Movements:
- `GET /api/stock-movements`
- `GET /api/stock-movements/:id`

Stock Adjustments:
- `GET /api/stock-adjustments`
- `GET /api/stock-adjustments/:id`
- `POST /api/stock-adjustments`
- `PATCH /api/stock-adjustments/:id/status`

Stock Transfers:
- `GET /api/stock-transfers`
- `GET /api/stock-transfers/:id`
- `GET /api/stock-transfers/transfer-no/:transferNo`
- `POST /api/stock-transfers`
- `POST /api/stock-transfers/:id/approve`
- `POST /api/stock-transfers/:id/ship`
- `POST /api/stock-transfers/:id/receive`
- `POST /api/stock-transfers/:id/cancel`
- `PATCH /api/stock-transfers/:id/status`

Shipments:
- `GET /api/shipments`
- `GET /api/shipments/:id`
- `GET /api/shipments/stock-transfer/:stockTransferId`
- `PATCH /api/shipments/:id/status`

FEFO:
- `GET /api/fefo/allocations`
- `GET /api/fefo/allocations/:id`
- `GET /api/fefo/allocations/order/:orderType/:orderId`
- `POST /api/fefo/preview`
- `POST /api/fefo/allocate`
- `POST /api/fefo/allocations/:id/release`
- `POST /api/fefo/release-by-order`

Gateway examples:
- `GET http://localhost:3000/api/companies`
- `GET http://localhost:3000/api/branches`
- `GET http://localhost:3000/api/stores`
- `GET http://localhost:3000/api/warehouses`
- `GET http://localhost:3000/api/pos-terminals`
- `GET http://localhost:3000/api/pos-sessions`
- `GET http://localhost:3000/api/pos-orders`
- `GET http://localhost:3000/api/pos-payments`
- `GET http://localhost:3000/api/receipts`
- `POST http://localhost:3000/api/verification/product-availability`
- `POST http://localhost:3000/api/verification/pos-sale`
- `GET http://localhost:3000/api/suppliers`
- `GET http://localhost:3000/api/purchase-orders`
- `GET http://localhost:3000/api/batches`
- `GET http://localhost:3000/api/goods-receipts`
- `GET http://localhost:3000/api/inventory`
- `GET http://localhost:3000/api/stock-movements`
- `GET http://localhost:3000/api/stock-adjustments`
- `GET http://localhost:3000/api/stock-transfers`
- `GET http://localhost:3000/api/shipments`
- `GET http://localhost:3000/api/fefo/allocations`
- `POST http://localhost:3000/api/fefo/preview`
- `POST http://localhost:3000/api/fefo/allocate`

Operation service Swagger:
- `http://localhost:3003/docs`

Seed:
```bash
npm run prisma:generate:operation
npm run prisma:seed:operation
```

Smoke test:
```bash
TOKEN=<jwt> bash scripts/smoke-operation.sh
```

Notes:
- This task implements inventory core only.
- This task does not implement POS selling.
- Branch/warehouse IDs are used by FE and other services as logical references.
- Gateway is the frontend entrypoint.
- Batch/Lot, FEFO allocation, and POS order flows are separate upcoming tasks.
- Purchase Order does not increase inventory.
- Inventory increases during Goods Receipt.
- `productId` on purchase order item is a logical reference to commerce product.
- `orderedByUserId` and `approvedByUserId` are logical references to identity users.
- Goods Receipt captures batch/lot and expiry information.
- Inventory posting will be handled in inventory posting flow after receipt confirmation.
- `productId` on batch/receipt item is a logical reference to commerce product.
- `receivedByUserId` is a logical reference to identity user.
- Inventory is tracked by `productId`, `batchId`, `warehouseId`, and `expiryDate`.
- StockMovement is append-only.
- FEFO allocates by earliest `expiryDate` first.
- FEFO allocation increases `quantityReserved` and recalculates `quantityAvailable`.
- FEFO allocation does not reduce `quantityOnHand`; consumption is handled later in fulfillment.
- `productId`, `orderId`, and `orderItemId` in FEFO are logical references.
- Stock transfer preserves batch/lot and expiry information.
- Source warehouse stock is deducted on ship.
- Destination warehouse stock is increased on receive.
- Every stock mutation creates `StockMovement`.
- `productId` on stock transfer item is a logical reference to commerce Product.
- user IDs on transfer/shipment are logical references to identity User.
- POS sale deducts inventory immediately.
- FEFO is used when `batchId` is not provided.
- Product details in POS order are snapshots and `productId` is a logical reference.
- Receipt printing is implemented in the next task.
- Receipt references POSOrder internally.
- Receipt references OnlineOrder logically only.
- Operation-service does not call commerce-service for receipt.
- Receipt printing UI is frontend responsibility.
- Refund/reversal is handled by POS refund flow.
- productId in operation records is a logical reference to commerce Product.
- user IDs in operation records are logical references to identity User.
- Inventory remains batch/lot/expiry aware across receipt, FEFO, transfer and POS flows.
- FEFO uses earliest expiry date first.
- POS sale deducts inventory.
- Stock transfer deducts source on ship and increases destination on receive.
