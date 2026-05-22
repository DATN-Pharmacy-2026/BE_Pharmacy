import {
  CompanyStatus,
  LocationStatus,
  LocationType,
  POSTerminalStatus,
  PrismaClient,
  StoreStatus,
  SupplierStatus,
  WarehouseStatus,
  WarehouseType,
  BranchStatus,
} from '../../node_modules/.prisma/client/operation';

const prisma = new PrismaClient();

const COMPANY_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const BRANCH_ID = '11111111-1111-1111-1111-111111111111';
const STORE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CENTRAL_WAREHOUSE_ID = '22222222-2222-2222-2222-222222222222';
const BRANCH_WAREHOUSE_ID = '33333333-3333-3333-3333-333333333333';
const POS_TERMINAL_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

async function main(): Promise<void> {
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
      id: BRANCH_ID,
      companyId: company.id,
      code: 'MAIN_BRANCH',
      name: 'Main Branch',
      address: 'Main Branch Address',
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
      id: STORE_ID,
      branchId: branch.id,
      code: 'MAIN_STORE',
      name: 'Main Store',
      address: 'Main Store Address',
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
      id: BRANCH_WAREHOUSE_ID,
      branchId: branch.id,
      code: 'MAIN_BRANCH_WAREHOUSE',
      name: 'Main Branch Warehouse',
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

  await prisma.pOSTerminal.upsert({
    where: { code: 'POS-001' },
    update: {
      name: 'POS-001',
      branchId: branch.id,
      storeId: store.id,
      status: POSTerminalStatus.ACTIVE,
    },
    create: {
      id: POS_TERMINAL_ID,
      branchId: branch.id,
      storeId: store.id,
      code: 'POS-001',
      name: 'POS-001',
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
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
