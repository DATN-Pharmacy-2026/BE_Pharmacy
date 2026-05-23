import {
  AllocationOrderType,
  AllocationStatus,
  BatchStatus,
  CompanyStatus,
  GoodsReceiptStatus,
  InventoryMovementType,
  LocationStatus,
  LocationType,
  PaymentMethod,
  PaymentStatus,
  POSTerminalStatus,
  POSOrderStatus,
  POSSessionStatus,
  PrismaClient,
  PurchaseOrderStatus,
  ShipmentStatus,
  StockTransferStatus,
  StoreStatus,
  SupplierStatus,
  WarehouseStatus,
  WarehouseType,
  BranchStatus,
} from '../../node_modules/.prisma/client/operation';
import { PrismaClient as CommercePrismaClient } from '../../node_modules/.prisma/client/commerce';
import { ProductStatus as CommerceProductStatus } from '../../node_modules/.prisma/client/commerce';

const prisma = new PrismaClient();
const commercePrisma = new CommercePrismaClient();

const COMPANY_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const BRANCH_1_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_2_ID = '11111111-1111-1111-1111-111111111112';
const STORE_1_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const STORE_2_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc';
const CENTRAL_WAREHOUSE_ID = '22222222-2222-2222-2222-222222222222';
const BRANCH_2_WAREHOUSE_ID = '22222222-2222-2222-2222-222222222223';
const BRANCH_1_WAREHOUSE_ID = '33333333-3333-3333-3333-333333333333';
const POS_TERMINAL_1_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const POS_TERMINAL_2_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccd';
const ADMIN_USER_ID = '60000000-0000-0000-0000-000000000001';
const CASHIER_USER_ID = '60000000-0000-0000-0000-000000000002';
const CUSTOMER_1_ID = '70000000-0000-0000-0000-000000000001';

function resolveSeedBaseDate(): Date {
  const fromEnv = process.env.SEED_BASE_DATE;
  const parsed = fromEnv ? new Date(fromEnv) : new Date('2026-01-01T00:00:00.000Z');
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid SEED_BASE_DATE. Use ISO format, e.g. 2026-01-01T00:00:00.000Z');
  }
  return parsed;
}

async function main(): Promise<void> {
  const baseDate = resolveSeedBaseDate();
  const existingCompany = await prisma.company.findFirst({ where: { name: 'Pharmacy Group' } });

  const company = existingCompany
    ? await prisma.company.update({
        where: { id: existingCompany.id },
        data: { status: CompanyStatus.ACTIVE },
      })
    : await prisma.company.create({
        data: {
          id: COMPANY_ID,
          name: 'Pharmacy Group',
          status: CompanyStatus.ACTIVE,
        },
      });

  const branch = await prisma.branch.upsert({
    where: { code: 'MAIN_BRANCH' },
    update: {
      name: 'Main Branch',
      companyId: company.id,
      address: 'Main Branch Address',
      status: BranchStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      id: BRANCH_1_ID,
      companyId: company.id,
      code: 'MAIN_BRANCH',
      name: 'Main Branch',
      address: 'Main Branch Address',
      status: BranchStatus.ACTIVE,
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { code: 'BRANCH_2' },
    update: {
      name: 'Branch 2',
      companyId: company.id,
      address: 'Branch 2 Address',
      status: BranchStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      id: BRANCH_2_ID,
      companyId: company.id,
      code: 'BRANCH_2',
      name: 'Branch 2',
      address: 'Branch 2 Address',
      status: BranchStatus.ACTIVE,
    },
  });

  const store = await prisma.store.upsert({
    where: { code: 'MAIN_STORE' },
    update: {
      name: 'Main Store',
      branchId: branch.id,
      address: 'Main Store Address',
      status: StoreStatus.ACTIVE,
    },
    create: {
      id: STORE_1_ID,
      branchId: branch.id,
      code: 'MAIN_STORE',
      name: 'Main Store',
      address: 'Main Store Address',
      status: StoreStatus.ACTIVE,
    },
  });

  const store2 = await prisma.store.upsert({
    where: { code: 'BRANCH2_STORE' },
    update: {
      name: 'Branch 2 Store',
      branchId: branch2.id,
      address: 'Branch 2 Store Address',
      status: StoreStatus.ACTIVE,
    },
    create: {
      id: STORE_2_ID,
      branchId: branch2.id,
      code: 'BRANCH2_STORE',
      name: 'Branch 2 Store',
      address: 'Branch 2 Store Address',
      status: StoreStatus.ACTIVE,
    },
  });

  const centralWarehouse = await prisma.warehouse.upsert({
    where: { code: 'CENTRAL_WAREHOUSE' },
    update: {
      name: 'Central Warehouse',
      branchId: null,
      type: WarehouseType.CENTRAL,
      status: WarehouseStatus.ACTIVE,
      isCentral: true,
    },
    create: {
      id: CENTRAL_WAREHOUSE_ID,
      branchId: null,
      code: 'CENTRAL_WAREHOUSE',
      name: 'Central Warehouse',
      type: WarehouseType.CENTRAL,
      status: WarehouseStatus.ACTIVE,
      isCentral: true,
    },
  });

  const branchWarehouse = await prisma.warehouse.upsert({
    where: { code: 'MAIN_BRANCH_WAREHOUSE' },
    update: {
      name: 'Main Branch Warehouse',
      branchId: branch.id,
      type: WarehouseType.BRANCH,
      status: WarehouseStatus.ACTIVE,
      isCentral: false,
    },
    create: {
      id: BRANCH_1_WAREHOUSE_ID,
      branchId: branch.id,
      code: 'MAIN_BRANCH_WAREHOUSE',
      name: 'Main Branch Warehouse',
      type: WarehouseType.BRANCH,
      status: WarehouseStatus.ACTIVE,
      isCentral: false,
    },
  });

  const branch2Warehouse = await prisma.warehouse.upsert({
    where: { code: 'BRANCH2_WAREHOUSE' },
    update: {
      name: 'Branch 2 Warehouse',
      branchId: branch2.id,
      type: WarehouseType.BRANCH,
      status: WarehouseStatus.ACTIVE,
      isCentral: false,
    },
    create: {
      id: BRANCH_2_WAREHOUSE_ID,
      branchId: branch2.id,
      code: 'BRANCH2_WAREHOUSE',
      name: 'Branch 2 Warehouse',
      type: WarehouseType.BRANCH,
      status: WarehouseStatus.ACTIVE,
      isCentral: false,
    },
  });

  await prisma.warehouseLocation.upsert({
    where: {
      warehouseId_code: {
        warehouseId: centralWarehouse.id,
        code: 'DEFAULT',
      },
    },
    update: {
      name: 'Default Location',
      type: LocationType.STORAGE,
      status: LocationStatus.ACTIVE,
    },
    create: {
      warehouseId: centralWarehouse.id,
      code: 'DEFAULT',
      name: 'Default Location',
      type: LocationType.STORAGE,
      status: LocationStatus.ACTIVE,
    },
  });

  await prisma.warehouseLocation.upsert({
    where: {
      warehouseId_code: {
        warehouseId: branchWarehouse.id,
        code: 'SHELF-A',
      },
    },
    update: {
      name: 'Shelf A',
      type: LocationType.PICKING,
      status: LocationStatus.ACTIVE,
    },
    create: {
      warehouseId: branchWarehouse.id,
      code: 'SHELF-A',
      name: 'Shelf A',
      type: LocationType.PICKING,
      status: LocationStatus.ACTIVE,
    },
  });

  await prisma.warehouseLocation.upsert({
    where: {
      warehouseId_code: {
        warehouseId: branch2Warehouse.id,
        code: 'SHELF-B',
      },
    },
    update: {
      name: 'Shelf B',
      type: LocationType.PICKING,
      status: LocationStatus.ACTIVE,
    },
    create: {
      warehouseId: branch2Warehouse.id,
      code: 'SHELF-B',
      name: 'Shelf B',
      type: LocationType.PICKING,
      status: LocationStatus.ACTIVE,
    },
  });

  await prisma.pOSTerminal.upsert({
    where: { code: 'POS-001' },
    update: {
      name: 'POS-001',
      branchId: branch.id,
      storeId: store.id,
      status: POSTerminalStatus.ACTIVE,
    },
    create: {
      id: POS_TERMINAL_1_ID,
      branchId: branch.id,
      storeId: store.id,
      code: 'POS-001',
      name: 'POS-001',
      status: POSTerminalStatus.ACTIVE,
    },
  });

  await prisma.pOSTerminal.upsert({
    where: { code: 'POS-002' },
    update: {
      name: 'POS-002',
      branchId: branch2.id,
      storeId: store2.id,
      status: POSTerminalStatus.ACTIVE,
    },
    create: {
      id: POS_TERMINAL_2_ID,
      branchId: branch2.id,
      storeId: store2.id,
      code: 'POS-002',
      name: 'POS-002',
      status: POSTerminalStatus.ACTIVE,
    },
  });

  await prisma.supplier.upsert({
    where: { code: 'DEFAULT-SUPPLIER' },
    update: {
      name: 'Default Supplier',
      status: SupplierStatus.ACTIVE,
    },
    create: {
      code: 'DEFAULT-SUPPLIER',
      name: 'Default Supplier',
      status: SupplierStatus.ACTIVE,
    },
  });

  await prisma.supplier.upsert({
    where: { code: 'PHARMA-SUPPLIER' },
    update: {
      name: 'Pharma Supplier',
      status: SupplierStatus.ACTIVE,
    },
    create: {
      code: 'PHARMA-SUPPLIER',
      name: 'Pharma Supplier',
      status: SupplierStatus.ACTIVE,
    },
  });

  const products = await commercePrisma.product.findMany({
    where: { status: CommerceProductStatus.ACTIVE },
    orderBy: { createdAt: 'asc' },
    take: 3,
  });
  if (products.length === 0) return;

  const p1 = products[0];
  const p2 = products[1] ?? products[0];
  const paidOnlineOrder = await commercePrisma.onlineOrder.findUnique({
    where: { orderNo: 'ONL-2026-0001' },
    select: { id: true },
  });
  const paidOrderItem = paidOnlineOrder
    ? await commercePrisma.onlineOrderItem.findFirst({
        where: { onlineOrderId: paidOnlineOrder.id },
        orderBy: { id: 'asc' },
        select: { id: true },
      })
    : null;

  const po = await prisma.purchaseOrder.upsert({
    where: { poNo: 'PO-2026-0001' },
    update: {
      supplierId: (await prisma.supplier.findUniqueOrThrow({ where: { code: 'DEFAULT-SUPPLIER' } })).id,
      warehouseId: centralWarehouse.id,
      branchId: branch.id,
      status: PurchaseOrderStatus.APPROVED,
      orderedByUserId: ADMIN_USER_ID,
      approvedByUserId: ADMIN_USER_ID,
      expectedDate: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000),
      totalAmount: '1500000',
    },
    create: {
      poNo: 'PO-2026-0001',
      supplierId: (await prisma.supplier.findUniqueOrThrow({ where: { code: 'DEFAULT-SUPPLIER' } })).id,
      warehouseId: centralWarehouse.id,
      branchId: branch.id,
      status: PurchaseOrderStatus.APPROVED,
      orderedByUserId: ADMIN_USER_ID,
      approvedByUserId: ADMIN_USER_ID,
      expectedDate: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000),
      totalAmount: '1500000',
    },
  });

  await prisma.purchaseOrderItem.upsert({
    where: { id: '81000000-0000-0000-0000-000000000011' },
    update: {
      purchaseOrderId: po.id,
      productId: p1.id,
      sku: p1.sku,
      productNameSnapshot: p1.name,
      quantity: 100,
      unitCost: '20000',
      totalCost: '2000000',
    },
    create: {
      id: '81000000-0000-0000-0000-000000000011',
      purchaseOrderId: po.id,
      productId: p1.id,
      sku: p1.sku,
      productNameSnapshot: p1.name,
      quantity: 100,
      unitCost: '20000',
      totalCost: '2000000',
    },
  });

  const receipt = await prisma.goodsReceipt.upsert({
    where: { receiptNo: 'GR-2026-0001' },
    update: {
      purchaseOrderId: po.id,
      supplierId: po.supplierId,
      warehouseId: centralWarehouse.id,
      branchId: branch.id,
      receivedByUserId: ADMIN_USER_ID,
      status: GoodsReceiptStatus.RECEIVED,
      receivedAt: baseDate,
      note: 'Seeded receipt',
    },
    create: {
      receiptNo: 'GR-2026-0001',
      purchaseOrderId: po.id,
      supplierId: po.supplierId,
      warehouseId: centralWarehouse.id,
      branchId: branch.id,
      receivedByUserId: ADMIN_USER_ID,
      status: GoodsReceiptStatus.RECEIVED,
      receivedAt: baseDate,
      note: 'Seeded receipt',
    },
  });

  const batch = await prisma.batch.upsert({
    where: {
      productId_batchNo: {
        productId: p1.id,
        batchNo: 'BATCH-PARA-2601',
      },
    },
    update: {
      expiryDate: new Date('2027-12-31T00:00:00.000Z'),
      manufactureDate: new Date('2025-12-01T00:00:00.000Z'),
      supplierId: po.supplierId,
      status: BatchStatus.ACTIVE,
    },
    create: {
      productId: p1.id,
      batchNo: 'BATCH-PARA-2601',
      expiryDate: new Date('2027-12-31T00:00:00.000Z'),
      manufactureDate: new Date('2025-12-01T00:00:00.000Z'),
      supplierId: po.supplierId,
      status: BatchStatus.ACTIVE,
    },
  });

  await prisma.goodsReceiptItem.upsert({
    where: { id: '81000000-0000-0000-0000-000000000021' },
    update: {
      goodsReceiptId: receipt.id,
      productId: p1.id,
      batchId: batch.id,
      batchNo: batch.batchNo,
      expiryDate: batch.expiryDate,
      manufactureDate: batch.manufactureDate,
      quantity: 100,
      unitCost: '20000',
    },
    create: {
      id: '81000000-0000-0000-0000-000000000021',
      goodsReceiptId: receipt.id,
      productId: p1.id,
      batchId: batch.id,
      batchNo: batch.batchNo,
      expiryDate: batch.expiryDate,
      manufactureDate: batch.manufactureDate,
      quantity: 100,
      unitCost: '20000',
    },
  });

  const defaultLocation = await prisma.warehouseLocation.findUniqueOrThrow({
    where: { warehouseId_code: { warehouseId: centralWarehouse.id, code: 'DEFAULT' } },
  });

  await prisma.inventoryItem.upsert({
    where: {
      productId_batchId_warehouseId_locationId: {
        productId: p1.id,
        batchId: batch.id,
        warehouseId: centralWarehouse.id,
        locationId: defaultLocation.id,
      },
    },
    update: {
      branchId: null,
      quantityOnHand: 100,
      quantityReserved: 10,
      quantityAvailable: 90,
      unitCost: '20000',
      expiryDate: batch.expiryDate,
    },
    create: {
      productId: p1.id,
      batchId: batch.id,
      warehouseId: centralWarehouse.id,
      locationId: defaultLocation.id,
      branchId: null,
      quantityOnHand: 100,
      quantityReserved: 10,
      quantityAvailable: 90,
      unitCost: '20000',
      expiryDate: batch.expiryDate,
    },
  });

  await prisma.inventory.upsert({
    where: {
      tenantId_warehouseId_locationId_productId: {
        tenantId: COMPANY_ID,
        warehouseId: centralWarehouse.id,
        locationId: defaultLocation.id,
        productId: p1.id,
      },
    },
    update: {
      quantity: 100,
      reservedQuantity: 10,
      availableQuantity: 90,
      minQuantity: 20,
      maxQuantity: 500,
      isActive: true,
    },
    create: {
      tenantId: COMPANY_ID,
      warehouseId: centralWarehouse.id,
      locationId: defaultLocation.id,
      productId: p1.id,
      quantity: 100,
      reservedQuantity: 10,
      availableQuantity: 90,
      minQuantity: 20,
      maxQuantity: 500,
      isActive: true,
    },
  });

  await prisma.stockMovement.upsert({
    where: { id: '81000000-0000-0000-0000-000000000031' },
    update: {
      tenantId: COMPANY_ID,
      productId: p1.id,
      warehouseId: centralWarehouse.id,
      locationId: defaultLocation.id,
      movementType: InventoryMovementType.INITIAL_STOCK,
      quantity: 100,
      beforeQuantity: 0,
      afterQuantity: 100,
      referenceType: 'GOODS_RECEIPT',
      referenceId: receipt.id,
      reason: 'Seed initial stock',
      createdByUserId: ADMIN_USER_ID,
    },
    create: {
      id: '81000000-0000-0000-0000-000000000031',
      tenantId: COMPANY_ID,
      productId: p1.id,
      warehouseId: centralWarehouse.id,
      locationId: defaultLocation.id,
      movementType: InventoryMovementType.INITIAL_STOCK,
      quantity: 100,
      beforeQuantity: 0,
      afterQuantity: 100,
      referenceType: 'GOODS_RECEIPT',
      referenceId: receipt.id,
      reason: 'Seed initial stock',
      createdByUserId: ADMIN_USER_ID,
      createdAt: baseDate,
    },
  });

  const transfer = await prisma.stockTransfer.upsert({
    where: { transferNo: 'TR-2026-0001' },
    update: {
      fromWarehouseId: centralWarehouse.id,
      toWarehouseId: branchWarehouse.id,
      fromBranchId: null,
      toBranchId: branch.id,
      requestedByUserId: ADMIN_USER_ID,
      approvedByUserId: ADMIN_USER_ID,
      status: StockTransferStatus.SHIPPED,
      requestedAt: baseDate,
      approvedAt: baseDate,
      shippedAt: new Date(baseDate.getTime() + 2 * 60 * 60 * 1000),
      receivedAt: null,
    },
    create: {
      transferNo: 'TR-2026-0001',
      fromWarehouseId: centralWarehouse.id,
      toWarehouseId: branchWarehouse.id,
      fromBranchId: null,
      toBranchId: branch.id,
      requestedByUserId: ADMIN_USER_ID,
      approvedByUserId: ADMIN_USER_ID,
      status: StockTransferStatus.SHIPPED,
      requestedAt: baseDate,
      approvedAt: baseDate,
      shippedAt: new Date(baseDate.getTime() + 2 * 60 * 60 * 1000),
    },
  });

  await prisma.stockTransferItem.upsert({
    where: { id: '81000000-0000-0000-0000-000000000041' },
    update: {
      stockTransferId: transfer.id,
      productId: p1.id,
      batchId: batch.id,
      requestedQty: 20,
      shippedQty: 20,
      receivedQty: 0,
    },
    create: {
      id: '81000000-0000-0000-0000-000000000041',
      stockTransferId: transfer.id,
      productId: p1.id,
      batchId: batch.id,
      requestedQty: 20,
      shippedQty: 20,
      receivedQty: 0,
    },
  });

  await prisma.shipment.upsert({
    where: { shipmentNo: 'SHIP-2026-0001' },
    update: {
      stockTransferId: transfer.id,
      carrierName: 'Internal Logistics',
      trackingNo: 'TRK-2026-0001',
      status: ShipmentStatus.IN_TRANSIT,
      shippedByUserId: ADMIN_USER_ID,
      receivedByUserId: null,
      shippedAt: new Date(baseDate.getTime() + 3 * 60 * 60 * 1000),
      deliveredAt: null,
    },
    create: {
      shipmentNo: 'SHIP-2026-0001',
      stockTransferId: transfer.id,
      carrierName: 'Internal Logistics',
      trackingNo: 'TRK-2026-0001',
      status: ShipmentStatus.IN_TRANSIT,
      shippedByUserId: ADMIN_USER_ID,
      shippedAt: new Date(baseDate.getTime() + 3 * 60 * 60 * 1000),
    },
  });

  const posSession = await prisma.pOSSession.upsert({
    where: { id: '82000000-0000-0000-0000-000000000001' },
    update: {
      branchId: branch.id,
      storeId: store.id,
      posTerminalId: POS_TERMINAL_1_ID,
      cashierUserId: CASHIER_USER_ID,
      openingCash: '500000',
      closingCash: null,
      openedAt: baseDate,
      closedAt: null,
      status: POSSessionStatus.OPEN,
    },
    create: {
      id: '82000000-0000-0000-0000-000000000001',
      branchId: branch.id,
      storeId: store.id,
      posTerminalId: POS_TERMINAL_1_ID,
      cashierUserId: CASHIER_USER_ID,
      openingCash: '500000',
      openedAt: baseDate,
      status: POSSessionStatus.OPEN,
    },
  });

  const posOrder = await prisma.pOSOrder.upsert({
    where: { orderNo: 'POS-2026-0001' },
    update: {
      branchId: branch.id,
      storeId: store.id,
      posTerminalId: POS_TERMINAL_1_ID,
      posSessionId: posSession.id,
      cashierUserId: CASHIER_USER_ID,
      customerUserId: CUSTOMER_1_ID,
      status: POSOrderStatus.COMPLETED,
      subtotal: '95000',
      discountTotal: '5000',
      taxTotal: '0',
      grandTotal: '90000',
    },
    create: {
      orderNo: 'POS-2026-0001',
      branchId: branch.id,
      storeId: store.id,
      posTerminalId: POS_TERMINAL_1_ID,
      posSessionId: posSession.id,
      cashierUserId: CASHIER_USER_ID,
      customerUserId: CUSTOMER_1_ID,
      status: POSOrderStatus.COMPLETED,
      subtotal: '95000',
      discountTotal: '5000',
      taxTotal: '0',
      grandTotal: '90000',
      createdAt: baseDate,
    },
  });

  await prisma.pOSOrderItem.upsert({
    where: { id: '82000000-0000-0000-0000-000000000011' },
    update: {
      posOrderId: posOrder.id,
      productId: p2.id,
      batchId: null,
      sku: p2.sku,
      productNameSnapshot: p2.name,
      quantity: 1,
      unitPrice: '95000',
      discountAmount: '5000',
      totalAmount: '90000',
    },
    create: {
      id: '82000000-0000-0000-0000-000000000011',
      posOrderId: posOrder.id,
      productId: p2.id,
      batchId: null,
      sku: p2.sku,
      productNameSnapshot: p2.name,
      quantity: 1,
      unitPrice: '95000',
      discountAmount: '5000',
      totalAmount: '90000',
    },
  });

  await prisma.pOSPayment.upsert({
    where: { id: '82000000-0000-0000-0000-000000000021' },
    update: {
      posOrderId: posOrder.id,
      method: PaymentMethod.CASH,
      amount: '90000',
      status: PaymentStatus.PAID,
      paidAt: baseDate,
    },
    create: {
      id: '82000000-0000-0000-0000-000000000021',
      posOrderId: posOrder.id,
      method: PaymentMethod.CASH,
      amount: '90000',
      status: PaymentStatus.PAID,
      paidAt: baseDate,
    },
  });

  await prisma.receipt.upsert({
    where: { receiptNo: 'RCP-2026-0001' },
    update: {
      posOrderId: posOrder.id,
      onlineOrderId: paidOnlineOrder?.id ?? null,
      branchId: branch.id,
      storeId: store.id,
      issuedByUserId: CASHIER_USER_ID,
      totalAmount: '90000',
      issuedAt: baseDate,
    },
    create: {
      receiptNo: 'RCP-2026-0001',
      posOrderId: posOrder.id,
      onlineOrderId: paidOnlineOrder?.id ?? null,
      branchId: branch.id,
      storeId: store.id,
      issuedByUserId: CASHIER_USER_ID,
      totalAmount: '90000',
      issuedAt: baseDate,
    },
  });

  await prisma.fEFOAllocation.upsert({
    where: { id: '83000000-0000-0000-0000-000000000001' },
    update: {
      productId: p1.id,
      orderType: AllocationOrderType.ONLINE_ORDER,
      orderId: paidOnlineOrder?.id ?? '90000000-0000-0000-0000-000000000001',
      orderItemId: paidOrderItem?.id ?? '90000000-0000-0000-0000-000000000101',
      warehouseId: centralWarehouse.id,
      branchId: branch.id,
      batchId: batch.id,
      expiryDate: batch.expiryDate,
      allocatedQty: 2,
      status: AllocationStatus.RESERVED,
    },
    create: {
      id: '83000000-0000-0000-0000-000000000001',
      productId: p1.id,
      orderType: AllocationOrderType.ONLINE_ORDER,
      orderId: paidOnlineOrder?.id ?? '90000000-0000-0000-0000-000000000001',
      orderItemId: paidOrderItem?.id ?? '90000000-0000-0000-0000-000000000101',
      warehouseId: centralWarehouse.id,
      branchId: branch.id,
      batchId: batch.id,
      expiryDate: batch.expiryDate,
      allocatedQty: 2,
      status: AllocationStatus.RESERVED,
      createdAt: baseDate,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await commercePrisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await commercePrisma.$disconnect();
    process.exit(1);
  });
