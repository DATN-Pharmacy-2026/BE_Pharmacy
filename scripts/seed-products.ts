import { PrismaClient as CommercePrismaClient, ProductStatus } from '../node_modules/.prisma/client/commerce';
import {
  BatchStatus,
  BranchStatus,
  CompanyStatus,
  InventoryMovementType,
  LocationStatus,
  LocationType,
  SupplierStatus,
  WarehouseStatus,
  WarehouseType,
  PrismaClient as OperationPrismaClient,
} from '../node_modules/.prisma/client/operation';
import { pharmacySeedProducts, type PharmacyProductSeedItem } from './data/pharmacy-products-seed';

const commercePrisma = new CommercePrismaClient();
const operationPrisma = new OperationPrismaClient();

const DEFAULT_TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DEFAULT_ACTOR_USER_ID = '60000000-0000-0000-0000-000000000001';

type SeedSummary = {
  processed: number;
  createdProducts: number;
  updatedProducts: number;
  createdCategories: number;
  createdBrands: number;
  createdSuppliers: number;
  createdBranches: number;
  createdWarehouses: number;
  upsertedBatches: number;
  upsertedInventory: number;
  errors: number;
};

const summary: SeedSummary = {
  processed: 0,
  createdProducts: 0,
  updatedProducts: 0,
  createdCategories: 0,
  createdBrands: 0,
  createdSuppliers: 0,
  createdBranches: 0,
  createdWarehouses: 0,
  upsertedBatches: 0,
  upsertedInventory: 0,
  errors: 0,
};

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function normalizeCode(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function mapStatus(status: PharmacyProductSeedItem['status']): ProductStatus {
  if (status === 'INACTIVE') return ProductStatus.INACTIVE;
  if (status === 'DISCONTINUED') return ProductStatus.DISCONTINUED;
  if (status === 'DRAFT') return ProductStatus.DRAFT;
  return ProductStatus.ACTIVE;
}

function extractIndication(description: string): string {
  const [firstSegment] = description.split('Cách dùng:');
  return firstSegment.trim();
}

function validateSeedItem(item: PharmacyProductSeedItem): string[] {
  const errors: string[] = [];
  if (!item.name.trim()) errors.push('missing name');
  if (!item.slug.trim()) errors.push('missing slug');
  if (!item.sku.trim()) errors.push('missing sku');
  if (!item.categoryName.trim()) errors.push('missing categoryName');
  if (!item.baseUnit.trim()) errors.push('missing baseUnit');
  if (!Number.isFinite(item.basePrice)) errors.push('invalid basePrice');
  if (item.initialStock.enabled) {
    if (!item.initialStock.branchName.trim()) errors.push('missing initialStock.branchName');
    if (!item.initialStock.warehouseName.trim()) errors.push('missing initialStock.warehouseName');
    if (!item.initialStock.supplierName.trim()) errors.push('missing initialStock.supplierName');
    if (!item.initialStock.lotCode.trim()) errors.push('missing initialStock.lotCode');
    if (item.initialStock.quantity <= 0) errors.push('invalid initialStock.quantity');
    if (!item.initialStock.expiryDate) errors.push('missing initialStock.expiryDate');
  }
  return errors;
}

async function findOrCreateCategory(name: string) {
  const slug = slugify(name);
  const existing = await commercePrisma.category.findUnique({ where: { slug } });
  if (existing) {
    return commercePrisma.category.update({
      where: { id: existing.id },
      data: { name, isActive: true },
    });
  }
  summary.createdCategories += 1;
  return commercePrisma.category.create({
    data: {
      name,
      slug,
      isActive: true,
    },
  });
}

async function findOrCreateBrand(name?: string | null) {
  const safeName = name?.trim() || 'Default Pharma';
  const slug = slugify(safeName);
  const existing = await commercePrisma.brand.findUnique({ where: { slug } });
  if (existing) {
    return commercePrisma.brand.update({
      where: { id: existing.id },
      data: { name: safeName, isActive: true },
    });
  }
  summary.createdBrands += 1;
  return commercePrisma.brand.create({
    data: {
      name: safeName,
      slug,
      isActive: true,
      country: 'VN',
    },
  });
}

async function findOrCreateCompany() {
  const existing = await operationPrisma.company.findFirst({
    where: { name: 'Pharmacy Group' },
  });
  if (existing) {
    return operationPrisma.company.update({
      where: { id: existing.id },
      data: { status: CompanyStatus.ACTIVE },
    });
  }
  return operationPrisma.company.create({
    data: {
      id: DEFAULT_TENANT_ID,
      name: 'Pharmacy Group',
      status: CompanyStatus.ACTIVE,
    },
  });
}

async function findOrCreateBranch(branchName: string) {
  const company = await findOrCreateCompany();
  const code = branchName === 'Main Branch' ? 'MAIN_BRANCH' : normalizeCode(branchName);
  const existing = await operationPrisma.branch.findUnique({ where: { code } });
  if (existing) {
    return operationPrisma.branch.update({
      where: { id: existing.id },
      data: {
        name: branchName,
        companyId: company.id,
        address: `${branchName} Address`,
        status: BranchStatus.ACTIVE,
        deletedAt: null,
      },
    });
  }
  summary.createdBranches += 1;
  return operationPrisma.branch.create({
    data: {
      companyId: company.id,
      code,
      name: branchName,
      address: `${branchName} Address`,
      status: BranchStatus.ACTIVE,
    },
  });
}

async function findOrCreateWarehouse(warehouseName: string, branchId: string) {
  const code = warehouseName === 'Main Branch Warehouse'
    ? 'MAIN_BRANCH_WAREHOUSE'
    : normalizeCode(warehouseName);
  const existing = await operationPrisma.warehouse.findUnique({ where: { code } });
  const warehouse = existing
    ? await operationPrisma.warehouse.update({
        where: { id: existing.id },
        data: {
          name: warehouseName,
          branchId,
          type: WarehouseType.BRANCH,
          status: WarehouseStatus.ACTIVE,
          isCentral: false,
        },
      })
    : await operationPrisma.warehouse.create({
        data: {
          branchId,
          code,
          name: warehouseName,
          type: WarehouseType.BRANCH,
          status: WarehouseStatus.ACTIVE,
          isCentral: false,
        },
      });

  if (!existing) summary.createdWarehouses += 1;

  const locationCode = warehouse.code === 'MAIN_BRANCH_WAREHOUSE' ? 'SHELF-A' : 'DEFAULT';
  const locationName = locationCode === 'SHELF-A' ? 'Shelf A' : 'Default Location';
  const location = await operationPrisma.warehouseLocation.upsert({
    where: {
      warehouseId_code: {
        warehouseId: warehouse.id,
        code: locationCode,
      },
    },
    update: {
      name: locationName,
      type: LocationType.PICKING,
      status: LocationStatus.ACTIVE,
    },
    create: {
      warehouseId: warehouse.id,
      code: locationCode,
      name: locationName,
      type: LocationType.PICKING,
      status: LocationStatus.ACTIVE,
    },
  });

  return { warehouse, location };
}

async function findOrCreateSupplier(supplierName: string) {
  const code = supplierName === 'Default Supplier' ? 'DEFAULT-SUPPLIER' : normalizeCode(supplierName);
  const existing = await operationPrisma.supplier.findUnique({ where: { code } });
  if (existing) {
    return operationPrisma.supplier.update({
      where: { id: existing.id },
      data: {
        name: supplierName,
        status: SupplierStatus.ACTIVE,
      },
    });
  }
  summary.createdSuppliers += 1;
  return operationPrisma.supplier.create({
    data: {
      code,
      name: supplierName,
      status: SupplierStatus.ACTIVE,
    },
  });
}

async function upsertProduct(item: PharmacyProductSeedItem) {
  const category = await findOrCreateCategory(item.categoryName);
  const brand = await findOrCreateBrand(item.brandName);

  const existingBySku = await commercePrisma.product.findUnique({
    where: { sku: item.sku },
    select: { id: true, sku: true },
  });
  const existingBySlug = existingBySku
    ? null
    : await commercePrisma.product.findUnique({
        where: { slug: item.slug },
        select: { id: true, slug: true },
      });

  const existing = existingBySku ?? existingBySlug;
  const payload = {
    categoryId: category.id,
    brandId: brand.id,
    sku: item.sku,
    barcode: item.barcode?.trim() || null,
    name: item.name.trim(),
    slug: item.slug.trim(),
    description: item.description.trim(),
    indication: extractIndication(item.description),
    activeIngredient: item.activeIngredient?.trim() || null,
    dosageForm: item.dosageForm?.trim() || null,
    strength: item.strength?.trim() || null,
    registrationNumber: item.registrationNumber?.trim() || null,
    requiresPrescription: item.requiresPrescription,
    unit: item.baseUnit.trim(),
    basePrice: item.basePrice,
    minStockLevel: item.initialStock.minStock,
    status: mapStatus(item.status),
    deletedAt: null,
  };

  const product = existing
    ? await commercePrisma.product.update({
        where: { id: existing.id },
        data: payload,
      })
    : await commercePrisma.product.create({
        data: payload,
      });

  if (existing) summary.updatedProducts += 1;
  else summary.createdProducts += 1;

  if (item.imageUrl?.trim()) {
    const existingImage = await commercePrisma.productImage.findFirst({
      where: { productId: product.id, sortOrder: 0 },
      select: { id: true },
    });
    const imagePayload = {
      url: item.imageUrl.trim(),
      alt: item.name.trim(),
      sortOrder: 0,
    };
    if (existingImage) {
      await commercePrisma.productImage.update({
        where: { id: existingImage.id },
        data: imagePayload,
      });
    } else {
      await commercePrisma.productImage.create({
        data: {
          productId: product.id,
          ...imagePayload,
        },
      });
    }
  }

  return product;
}

async function upsertInitialStock(productId: string, item: PharmacyProductSeedItem) {
  if (!item.initialStock.enabled) return;

  const branch = await findOrCreateBranch(item.initialStock.branchName);
  const { warehouse, location } = await findOrCreateWarehouse(item.initialStock.warehouseName, branch.id);
  const supplier = await findOrCreateSupplier(item.initialStock.supplierName);

  await operationPrisma.$transaction(async (tx) => {
    const batch = await tx.batch.upsert({
      where: {
        productId_batchNo: {
          productId,
          batchNo: item.initialStock.lotCode,
        },
      },
      update: {
        manufactureDate: item.initialStock.manufacturingDate ? new Date(item.initialStock.manufacturingDate) : null,
        expiryDate: new Date(item.initialStock.expiryDate),
        supplierId: supplier.id,
        status: BatchStatus.ACTIVE,
      },
      create: {
        productId,
        batchNo: item.initialStock.lotCode,
        manufactureDate: item.initialStock.manufacturingDate ? new Date(item.initialStock.manufacturingDate) : null,
        expiryDate: new Date(item.initialStock.expiryDate),
        supplierId: supplier.id,
        status: BatchStatus.ACTIVE,
      },
    });
    summary.upsertedBatches += 1;

    const existingInventoryItem = await tx.inventoryItem.findUnique({
      where: {
        productId_batchId_warehouseId_locationId: {
          productId,
          batchId: batch.id,
          warehouseId: warehouse.id,
          locationId: location.id,
        },
      },
      select: { quantityOnHand: true },
    });

    await tx.inventoryItem.upsert({
      where: {
        productId_batchId_warehouseId_locationId: {
          productId,
          batchId: batch.id,
          warehouseId: warehouse.id,
          locationId: location.id,
        },
      },
      update: {
        branchId: branch.id,
        quantityOnHand: item.initialStock.quantity,
        quantityReserved: 0,
        quantityAvailable: item.initialStock.quantity,
        unitCost: item.initialStock.costPrice,
        expiryDate: new Date(item.initialStock.expiryDate),
      },
      create: {
        productId,
        batchId: batch.id,
        warehouseId: warehouse.id,
        locationId: location.id,
        branchId: branch.id,
        quantityOnHand: item.initialStock.quantity,
        quantityReserved: 0,
        quantityAvailable: item.initialStock.quantity,
        unitCost: item.initialStock.costPrice,
        expiryDate: new Date(item.initialStock.expiryDate),
      },
    });

    await tx.inventory.upsert({
      where: {
        tenantId_warehouseId_locationId_productId: {
          tenantId: DEFAULT_TENANT_ID,
          warehouseId: warehouse.id,
          locationId: location.id,
          productId,
        },
      },
      update: {
        quantity: item.initialStock.quantity,
        reservedQuantity: 0,
        availableQuantity: item.initialStock.quantity,
        minQuantity: item.initialStock.minStock,
        isActive: true,
      },
      create: {
        tenantId: DEFAULT_TENANT_ID,
        warehouseId: warehouse.id,
        locationId: location.id,
        productId,
        quantity: item.initialStock.quantity,
        reservedQuantity: 0,
        availableQuantity: item.initialStock.quantity,
        minQuantity: item.initialStock.minStock,
        isActive: true,
      },
    });
    summary.upsertedInventory += 1;

    const movementReferenceId = `${productId}:${warehouse.id}:${item.initialStock.lotCode}`;
    const existingMovement = await tx.stockMovement.findFirst({
      where: {
        tenantId: DEFAULT_TENANT_ID,
        referenceType: 'PRODUCT_SEED',
        referenceId: movementReferenceId,
      },
      select: { id: true },
    });

    const beforeQuantity = existingInventoryItem?.quantityOnHand ?? 0;
    const afterQuantity = item.initialStock.quantity;

    if (existingMovement) {
      await tx.stockMovement.update({
        where: { id: existingMovement.id },
        data: {
          warehouseId: warehouse.id,
          locationId: location.id,
          quantity: afterQuantity - beforeQuantity,
          beforeQuantity,
          afterQuantity,
          reason: `Seed initial stock for ${item.sku}`,
          createdByUserId: DEFAULT_ACTOR_USER_ID,
        },
      });
    } else {
      await tx.stockMovement.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          productId,
          warehouseId: warehouse.id,
          locationId: location.id,
          movementType: InventoryMovementType.INITIAL_STOCK,
          quantity: afterQuantity - beforeQuantity,
          beforeQuantity,
          afterQuantity,
          referenceType: 'PRODUCT_SEED',
          referenceId: movementReferenceId,
          reason: `Seed initial stock for ${item.sku}`,
          createdByUserId: DEFAULT_ACTOR_USER_ID,
        },
      });
    }
  });
}

async function main() {
  for (const item of pharmacySeedProducts) {
    summary.processed += 1;
    const errors = validateSeedItem(item);
    if (errors.length > 0) {
      summary.errors += 1;
      console.error(`[SEED][SKIP] ${item.name}: ${errors.join(', ')}`);
      continue;
    }

    try {
      const product = await upsertProduct(item);
      await upsertInitialStock(product.id, item);
      console.log(`[SEED][OK] ${item.sku} -> ${product.id}`);
    } catch (error) {
      summary.errors += 1;
      console.error(`[SEED][ERROR] ${item.name}:`, error);
    }
  }

  console.log('[SEED][SUMMARY]', JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error('[SEED][FATAL]', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([
      commercePrisma.$disconnect(),
      operationPrisma.$disconnect(),
    ]);
  });
