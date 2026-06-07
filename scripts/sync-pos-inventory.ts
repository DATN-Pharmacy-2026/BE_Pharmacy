import {
  BatchStatus,
  InventoryMovementType,
  LocationStatus,
  LocationType,
  PrismaClient as OperationPrismaClient,
} from '../node_modules/.prisma/client/operation';
import {
  PrismaClient as CommercePrismaClient,
  ProductStatus,
} from '../node_modules/.prisma/client/commerce';

const commercePrisma = new CommercePrismaClient();
const operationPrisma = new OperationPrismaClient();

const DEFAULT_TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DEFAULT_ACTOR_USER_ID = '60000000-0000-0000-0000-000000000001';

type SyncOptions = {
  warehouseCode: string;
  initialQuantity: number;
  expiryYears: number;
};

function parsePositiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2);
  const options: SyncOptions = {
    warehouseCode: process.env.POS_SYNC_WAREHOUSE_CODE || 'MAIN_BRANCH_WAREHOUSE',
    initialQuantity: parsePositiveInteger(
      process.env.POS_SYNC_INITIAL_QUANTITY,
      100,
      'POS_SYNC_INITIAL_QUANTITY',
    ),
    expiryYears: parsePositiveInteger(
      process.env.POS_SYNC_EXPIRY_YEARS,
      3,
      'POS_SYNC_EXPIRY_YEARS',
    ),
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];

    if (arg === '--warehouse' && value) {
      options.warehouseCode = value;
      index += 1;
    } else if (arg === '--initial-quantity' && value) {
      options.initialQuantity = parsePositiveInteger(value, options.initialQuantity, '--initial-quantity');
      index += 1;
    } else if (arg === '--expiry-years' && value) {
      options.expiryYears = parsePositiveInteger(value, options.expiryYears, '--expiry-years');
      index += 1;
    }
  }

  return options;
}

function resolveExpiryDate(expiryYears: number): Date {
  const expiryDate = new Date();
  expiryDate.setUTCFullYear(expiryDate.getUTCFullYear() + expiryYears);
  expiryDate.setUTCHours(0, 0, 0, 0);
  return expiryDate;
}

async function main(): Promise<void> {
  const options = parseArgs();
  const warehouse = await operationPrisma.warehouse.findUnique({
    where: { code: options.warehouseCode },
  });
  if (!warehouse) {
    throw new Error(`Warehouse not found: ${options.warehouseCode}`);
  }

  const location = await operationPrisma.warehouseLocation.upsert({
    where: {
      warehouseId_code: {
        warehouseId: warehouse.id,
        code: 'DEFAULT',
      },
    },
    update: {
      name: 'Default Location',
      type: LocationType.STORAGE,
      status: LocationStatus.ACTIVE,
    },
    create: {
      warehouseId: warehouse.id,
      code: 'DEFAULT',
      name: 'Default Location',
      type: LocationType.STORAGE,
      status: LocationStatus.ACTIVE,
    },
  });

  const products = await commercePrisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    },
    select: {
      id: true,
      sku: true,
      basePrice: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const existingItems = await operationPrisma.inventoryItem.findMany({
    where: {
      warehouseId: warehouse.id,
      productId: { in: products.map((product) => product.id) },
    },
    select: { productId: true },
  });
  const existingProductIds = new Set(existingItems.map((item) => item.productId));
  const expiryDate = resolveExpiryDate(options.expiryYears);
  let created = 0;
  let unchanged = 0;

  for (const product of products) {
    if (existingProductIds.has(product.id)) {
      unchanged += 1;
      continue;
    }

    const batchNo = `POS-SYNC-${warehouse.code}`;
    await operationPrisma.$transaction(async (transaction) => {
      const batch = await transaction.batch.upsert({
        where: {
          productId_batchNo: {
            productId: product.id,
            batchNo,
          },
        },
        update: {
          expiryDate,
          status: BatchStatus.ACTIVE,
        },
        create: {
          productId: product.id,
          batchNo,
          expiryDate,
          status: BatchStatus.ACTIVE,
        },
      });

      await transaction.inventoryItem.create({
        data: {
          productId: product.id,
          batchId: batch.id,
          warehouseId: warehouse.id,
          locationId: location.id,
          branchId: warehouse.branchId,
          quantityOnHand: options.initialQuantity,
          quantityReserved: 0,
          quantityAvailable: options.initialQuantity,
          unitCost: product.basePrice,
          expiryDate,
        },
      });

      await transaction.inventory.upsert({
        where: {
          tenantId_warehouseId_locationId_productId: {
            tenantId: DEFAULT_TENANT_ID,
            warehouseId: warehouse.id,
            locationId: location.id,
            productId: product.id,
          },
        },
        update: {},
        create: {
          tenantId: DEFAULT_TENANT_ID,
          warehouseId: warehouse.id,
          locationId: location.id,
          productId: product.id,
          quantity: options.initialQuantity,
          reservedQuantity: 0,
          availableQuantity: options.initialQuantity,
          minQuantity: 5,
          isActive: true,
        },
      });

      await transaction.stockMovement.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          productId: product.id,
          warehouseId: warehouse.id,
          locationId: location.id,
          movementType: InventoryMovementType.INITIAL_STOCK,
          quantity: options.initialQuantity,
          beforeQuantity: 0,
          afterQuantity: options.initialQuantity,
          referenceType: 'POS_CATALOG_SYNC',
          referenceId: batch.id,
          reason: `Initial POS inventory sync for ${product.sku}`,
          createdByUserId: DEFAULT_ACTOR_USER_ID,
        },
      });
    });

    created += 1;
  }

  console.log(
    `[DONE] POS inventory sync for ${warehouse.code}: ${created} created, ${unchanged} unchanged, ${products.length} active products.`,
  );
}

main()
  .catch((error) => {
    console.error('[ERROR] sync-pos-inventory failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([
      commercePrisma.$disconnect(),
      operationPrisma.$disconnect(),
    ]);
  });
