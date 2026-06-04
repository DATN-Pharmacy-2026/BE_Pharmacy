import {
  CartStatus,
  CouponStatus,
  DiscountType,
  FulfillmentStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  ProductStatus,
} from '../../node_modules/.prisma/client/commerce';

const prisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;
const BRANCH_1_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_2_ID = '11111111-1111-1111-1111-111111111112';
const WAREHOUSE_1_ID = '22222222-2222-2222-2222-222222222222';
const CUSTOMER_1_ID = '70000000-0000-0000-0000-000000000001';
const CUSTOMER_2_ID = '70000000-0000-0000-0000-000000000002';

function buildProductImageUrl(product: { sku: string; name: string }): string {
  const label = encodeURIComponent(product.name.slice(0, 28));
  return `https://placehold.co/600x600/eef7ff/0f766e/png?text=${label}`;
}

async function ensureProductImage(product: { id: string; sku: string; name: string }) {
  const existingImage = await prisma.productImage.findFirst({
    where: { productId: product.id, sortOrder: 0 },
    select: { id: true },
  });
  const data = {
    url: buildProductImageUrl(product),
    alt: product.name,
    sortOrder: 0,
  };

  if (existingImage) {
    await prisma.productImage.update({
      where: { id: existingImage.id },
      data,
    });
    return;
  }

  await prisma.productImage.create({
    data: {
      productId: product.id,
      ...data,
    },
  });
}

async function seedProductImages() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, sku: true, name: true },
  });

  for (const product of products) {
    await ensureProductImage(product);
  }
}

function resolveSeedBaseDate(): Date {
  const fromEnv = process.env.SEED_BASE_DATE;
  const parsed = fromEnv ? new Date(fromEnv) : new Date('2026-01-01T00:00:00.000Z');
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid SEED_BASE_DATE. Use ISO format, e.g. 2026-01-01T00:00:00.000Z');
  }
  return parsed;
}

async function seedCategories() {
  const categories = [
    { name: 'Medicine', slug: 'medicine' },
    { name: 'Functional Food', slug: 'functional-food' },
    { name: 'Medical Equipment', slug: 'medical-equipment' },
    { name: 'Cosmetics', slug: 'cosmetics' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        isActive: true,
      },
      create: {
        ...category,
        isActive: true,
      },
    });
  }
}

async function seedBrands() {
  const brands = [
    { name: 'Internal Brand', slug: 'internal-brand', country: 'VN' },
    { name: 'Default Pharma', slug: 'default-pharma', country: 'VN' },
  ];

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {
        name: brand.name,
        country: brand.country,
        isActive: true,
      },
      create: {
        ...brand,
        isActive: true,
      },
    });
  }
}

async function seedProducts() {
  const medicineCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'medicine' } });
  const functionalFoodCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'functional-food' } });
  const equipmentCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'medical-equipment' } });

  const internalBrand = await prisma.brand.findUniqueOrThrow({ where: { slug: 'internal-brand' } });
  const defaultPharmaBrand = await prisma.brand.findUniqueOrThrow({ where: { slug: 'default-pharma' } });

  const products = [
    {
      sku: 'PARA-500MG-TAB-01',
      barcode: '8931001000001',
      name: 'Paracetamol 500mg',
      slug: 'paracetamol-500mg',
      description: 'Pain reliever and fever reducer tablet',
      indication: 'Cam sot, dau dau, dau nhuc co xuong khop',
      activeIngredient: 'Paracetamol',
      dosageForm: 'Tablet',
      strength: '500mg',
      registrationNumber: 'VN-REG-PARA-500',
      requiresPrescription: false,
      unit: 'box',
      basePrice: '25000',
      status: ProductStatus.ACTIVE,
      categoryId: medicineCategory.id,
      brandId: internalBrand.id,
    },
    {
      sku: 'VITC-1000MG-EFF-01',
      barcode: '8931001000002',
      name: 'Vitamin C 1000mg',
      slug: 'vitamin-c-1000mg',
      description: 'Vitamin C supplement',
      indication: 'Tang cuong de khang, ho tro hoi phuc sau om',
      activeIngredient: 'Vitamin C',
      dosageForm: 'Effervescent Tablet',
      strength: '1000mg',
      registrationNumber: 'VN-REG-VITC-1000',
      requiresPrescription: false,
      unit: 'tube',
      basePrice: '85000',
      status: ProductStatus.ACTIVE,
      categoryId: functionalFoodCategory.id,
      brandId: defaultPharmaBrand.id,
    },
    {
      sku: 'BPM-DEVICE-ARM-01',
      barcode: '8931001000003',
      name: 'Blood Pressure Monitor',
      slug: 'blood-pressure-monitor',
      description: 'Digital upper-arm blood pressure monitor',
      indication: 'Theo doi huyet ap tai nha',
      activeIngredient: null,
      dosageForm: 'Device',
      strength: null,
      registrationNumber: 'VN-REG-BPM-001',
      requiresPrescription: false,
      unit: 'piece',
      basePrice: '950000',
      status: ProductStatus.ACTIVE,
      categoryId: equipmentCategory.id,
      brandId: defaultPharmaBrand.id,
    },
    {
      sku: 'SALINE-NASAL-01',
      barcode: '8931001000004',
      name: 'Saline Nasal Spray',
      slug: 'saline-nasal-spray',
      description: 'Sterile saline spray for nasal hygiene',
      indication: 'Ve sinh mui, giam kho mui, ho tro cam lanh',
      activeIngredient: 'Sodium Chloride',
      dosageForm: 'Spray',
      strength: '0.9%',
      registrationNumber: 'VN-REG-SALINE-001',
      requiresPrescription: false,
      unit: 'bottle',
      basePrice: '42000',
      status: ProductStatus.ACTIVE,
      categoryId: medicineCategory.id,
      brandId: internalBrand.id,
    },
    {
      sku: 'AMOX-500MG-CAP-01',
      barcode: '8931001000005',
      name: 'Amoxicillin 500mg',
      slug: 'amoxicillin-500mg',
      description: 'Broad-spectrum antibiotic capsule',
      indication: 'Nhiem khuan duong ho hap, nhiem khuan tai mui hong',
      activeIngredient: 'Amoxicillin',
      dosageForm: 'Capsule',
      strength: '500mg',
      registrationNumber: 'VN-REG-AMOX-500',
      requiresPrescription: true,
      unit: 'box',
      basePrice: '68000',
      status: ProductStatus.ACTIVE,
      categoryId: medicineCategory.id,
      brandId: defaultPharmaBrand.id,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        ...product,
        deletedAt: null,
      },
      create: product,
    });
  }

  await seedBulkProducts(medicineCategory.id, functionalFoodCategory.id, equipmentCategory.id, internalBrand.id, defaultPharmaBrand.id);
  await seedProductImages();
}

async function seedBulkProducts(
  medicineCategoryId: string,
  functionalFoodCategoryId: string,
  equipmentCategoryId: string,
  internalBrandId: string,
  defaultPharmaBrandId: string,
) {
  const useCases = [
    'Cam sot',
    'Dau dau',
    'Dau xuong khop',
    'Ho tro tieu hoa',
    'Tang de khang',
    'Ngu ngon',
    'On dinh huyet ap',
    'Cham soc da',
    'Giam ho',
    'Bo sung vitamin',
  ];

  for (let i = 1; i <= 100; i++) {
    const isMedicine = i % 3 !== 0;
    const categoryId = isMedicine
      ? medicineCategoryId
      : i % 2 === 0
        ? functionalFoodCategoryId
        : equipmentCategoryId;
    const brandId = i % 2 === 0 ? internalBrandId : defaultPharmaBrandId;
    const useCase = useCases[i % useCases.length];
    const seq = String(i).padStart(3, '0');
    const sku = `DEMO-PROD-${seq}`;
    const slug = `demo-product-${seq}`;
    const barcode = `8999000${String(1000 + i).padStart(4, '0')}`;
    const basePrice = String(15000 + i * 3500);

    await prisma.product.upsert({
      where: { sku },
      update: {
        categoryId,
        brandId,
        barcode,
        name: `Demo Product ${seq}`,
        slug,
        description: `San pham demo so ${seq} cho kiem thu tai luong lon`,
        indication: `${useCase}, cham soc suc khoe hang ngay`,
        activeIngredient: isMedicine ? `Active Ingredient ${seq}` : null,
        dosageForm: isMedicine ? 'Tablet' : 'Supplement',
        strength: isMedicine ? `${200 + i}mg` : null,
        registrationNumber: `VN-DEMO-${seq}`,
        requiresPrescription: isMedicine && i % 5 === 0,
        unit: i % 4 === 0 ? 'bottle' : 'box',
        basePrice,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      },
      create: {
        categoryId,
        brandId,
        sku,
        barcode,
        name: `Demo Product ${seq}`,
        slug,
        description: `San pham demo so ${seq} cho kiem thu tai luong lon`,
        indication: `${useCase}, cham soc suc khoe hang ngay`,
        activeIngredient: isMedicine ? `Active Ingredient ${seq}` : null,
        dosageForm: isMedicine ? 'Tablet' : 'Supplement',
        strength: isMedicine ? `${200 + i}mg` : null,
        registrationNumber: `VN-DEMO-${seq}`,
        requiresPrescription: isMedicine && i % 5 === 0,
        unit: i % 4 === 0 ? 'bottle' : 'box',
        basePrice,
        status: ProductStatus.ACTIVE,
      },
    });
  }
}

async function seedCoupons() {
  const baseDate = resolveSeedBaseDate();
  const startsAt = new Date(baseDate.getTime() - DAY_MS);
  const endsAt = new Date(baseDate.getTime() + 365 * DAY_MS);

  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {
      name: 'Welcome 10 Percent',
      discountType: DiscountType.PERCENTAGE,
      discountValue: '10',
      minOrderAmount: '100000',
      maxDiscountAmount: '50000',
      usageLimit: 1000,
      startsAt,
      endsAt,
      status: CouponStatus.ACTIVE,
    },
    create: {
      code: 'WELCOME10',
      name: 'Welcome 10 Percent',
      discountType: DiscountType.PERCENTAGE,
      discountValue: '10',
      minOrderAmount: '100000',
      maxDiscountAmount: '50000',
      usageLimit: 1000,
      startsAt,
      endsAt,
      status: CouponStatus.ACTIVE,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'MOCK_FIXED' },
    update: {
      name: 'Mock Fixed Discount',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: '30000',
      minOrderAmount: '150000',
      maxDiscountAmount: null,
      usageLimit: 500,
      startsAt,
      endsAt,
      status: CouponStatus.ACTIVE,
    },
    create: {
      code: 'MOCK_FIXED',
      name: 'Mock Fixed Discount',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: '30000',
      minOrderAmount: '150000',
      usageLimit: 500,
      startsAt,
      endsAt,
      status: CouponStatus.ACTIVE,
    },
  });
}

async function seedCommerceTransactions() {
  const products = await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    orderBy: { createdAt: 'asc' },
    take: 3,
  });
  if (products.length < 2) return;

  const [p1, p2, p3] = products;

  const activeCart = await prisma.cart.upsert({
    where: { id: '90000000-0000-0000-0000-000000000001' },
    update: {
      userId: CUSTOMER_1_ID,
      branchId: BRANCH_1_ID,
      status: CartStatus.ACTIVE,
    },
    create: {
      id: '90000000-0000-0000-0000-000000000001',
      userId: CUSTOMER_1_ID,
      branchId: BRANCH_1_ID,
      status: CartStatus.ACTIVE,
      sessionId: null,
    },
  });

  const existingCartItem = await prisma.cartItem.findFirst({
    where: {
      cartId: activeCart.id,
      productId: p1.id,
      variantId: null,
    },
    select: { id: true },
  });
  if (existingCartItem) {
    await prisma.cartItem.update({
      where: { id: existingCartItem.id },
      data: {
        quantity: 2,
        unitPrice: p1.basePrice,
      },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: activeCart.id,
        productId: p1.id,
        quantity: 2,
        unitPrice: p1.basePrice,
      },
    });
  }

  await prisma.onlineOrder.upsert({
    where: { orderNo: 'ONL-2026-0001' },
    update: {
      userId: CUSTOMER_1_ID,
      branchId: BRANCH_1_ID,
      assignedWarehouseId: WAREHOUSE_1_ID,
      status: OrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      fulfillmentStatus: FulfillmentStatus.FULFILLED,
      subtotal: '110000',
      discountTotal: '10000',
      shippingFee: '15000',
      grandTotal: '115000',
      customerName: 'Customer Demo 1',
      customerPhone: '0900000007',
      shippingAddress: '123 Demo Street, Ho Chi Minh City',
      note: 'Seeded paid order',
    },
    create: {
      orderNo: 'ONL-2026-0001',
      userId: CUSTOMER_1_ID,
      branchId: BRANCH_1_ID,
      assignedWarehouseId: WAREHOUSE_1_ID,
      status: OrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      fulfillmentStatus: FulfillmentStatus.FULFILLED,
      subtotal: '110000',
      discountTotal: '10000',
      shippingFee: '15000',
      grandTotal: '115000',
      customerName: 'Customer Demo 1',
      customerPhone: '0900000007',
      shippingAddress: '123 Demo Street, Ho Chi Minh City',
      note: 'Seeded paid order',
    },
  });

  const paidOrder = await prisma.onlineOrder.findUniqueOrThrow({ where: { orderNo: 'ONL-2026-0001' } });

  await prisma.onlineOrderItem.upsert({
    where: { id: '90000000-0000-0000-0000-000000000101' },
    update: {
      onlineOrderId: paidOrder.id,
      productId: p1.id,
      variantId: null,
      sku: p1.sku,
      productNameSnapshot: p1.name,
      quantity: 2,
      unitPrice: '25000',
      discountAmount: '5000',
      totalAmount: '45000',
    },
    create: {
      id: '90000000-0000-0000-0000-000000000101',
      onlineOrderId: paidOrder.id,
      productId: p1.id,
      variantId: null,
      sku: p1.sku,
      productNameSnapshot: p1.name,
      quantity: 2,
      unitPrice: '25000',
      discountAmount: '5000',
      totalAmount: '45000',
    },
  });

  await prisma.onlineOrderItem.upsert({
    where: { id: '90000000-0000-0000-0000-000000000102' },
    update: {
      onlineOrderId: paidOrder.id,
      productId: p2.id,
      variantId: null,
      sku: p2.sku,
      productNameSnapshot: p2.name,
      quantity: 1,
      unitPrice: '65000',
      discountAmount: '5000',
      totalAmount: '60000',
    },
    create: {
      id: '90000000-0000-0000-0000-000000000102',
      onlineOrderId: paidOrder.id,
      productId: p2.id,
      variantId: null,
      sku: p2.sku,
      productNameSnapshot: p2.name,
      quantity: 1,
      unitPrice: '65000',
      discountAmount: '5000',
      totalAmount: '60000',
    },
  });

  await prisma.payment.upsert({
    where: { id: '90000000-0000-0000-0000-000000000201' },
    update: {
      onlineOrderId: paidOrder.id,
      method: PaymentMethod.BANK_TRANSFER,
      provider: 'VNPAY',
      transactionNo: 'VNPAY-DEMO-0001',
      amount: '115000',
      status: PaymentStatus.PAID,
      paidAt: resolveSeedBaseDate(),
    },
    create: {
      id: '90000000-0000-0000-0000-000000000201',
      onlineOrderId: paidOrder.id,
      method: PaymentMethod.BANK_TRANSFER,
      provider: 'VNPAY',
      transactionNo: 'VNPAY-DEMO-0001',
      amount: '115000',
      status: PaymentStatus.PAID,
      paidAt: resolveSeedBaseDate(),
    },
  });

  await prisma.onlineOrder.upsert({
    where: { orderNo: 'ONL-2026-0002' },
    update: {
      userId: CUSTOMER_2_ID,
      branchId: BRANCH_2_ID,
      assignedWarehouseId: WAREHOUSE_1_ID,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
      subtotal: '42000',
      discountTotal: '0',
      shippingFee: '10000',
      grandTotal: '52000',
      customerName: 'Customer Demo 2',
      customerPhone: '0900000018',
      shippingAddress: '456 Sample Road, Da Nang',
      note: 'Seeded pending order',
    },
    create: {
      orderNo: 'ONL-2026-0002',
      userId: CUSTOMER_2_ID,
      branchId: BRANCH_2_ID,
      assignedWarehouseId: WAREHOUSE_1_ID,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
      subtotal: '42000',
      discountTotal: '0',
      shippingFee: '10000',
      grandTotal: '52000',
      customerName: 'Customer Demo 2',
      customerPhone: '0900000018',
      shippingAddress: '456 Sample Road, Da Nang',
      note: 'Seeded pending order',
    },
  });

  const pendingOrder = await prisma.onlineOrder.findUniqueOrThrow({ where: { orderNo: 'ONL-2026-0002' } });

  await prisma.onlineOrderItem.upsert({
    where: { id: '90000000-0000-0000-0000-000000000103' },
    update: {
      onlineOrderId: pendingOrder.id,
      productId: p3?.id ?? p1.id,
      variantId: null,
      sku: (p3 ?? p1).sku,
      productNameSnapshot: (p3 ?? p1).name,
      quantity: 1,
      unitPrice: '42000',
      discountAmount: '0',
      totalAmount: '42000',
    },
    create: {
      id: '90000000-0000-0000-0000-000000000103',
      onlineOrderId: pendingOrder.id,
      productId: p3?.id ?? p1.id,
      variantId: null,
      sku: (p3 ?? p1).sku,
      productNameSnapshot: (p3 ?? p1).name,
      quantity: 1,
      unitPrice: '42000',
      discountAmount: '0',
      totalAmount: '42000',
    },
  });
}

async function main(): Promise<void> {
  await seedCategories();
  await seedBrands();
  await seedProducts();
  await seedCoupons();
  await seedCommerceTransactions();
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
