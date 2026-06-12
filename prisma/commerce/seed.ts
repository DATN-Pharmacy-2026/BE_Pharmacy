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
import {
  REAL_PRODUCT_CATALOG,
  buildDescription,
  buildRealProductSku,
  buildRealProductSlug,
  inferBrandName,
  inferBrandSlug,
  inferCategoryName,
  inferCategorySlug,
  inferDosageForm,
  inferRequiresPrescription,
  inferUnit,
} from '../../scripts/data/real-product-catalog';

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
    { name: 'Chăm sóc cá nhân', slug: 'personal-care' },
    { name: 'Thuốc', slug: 'medicine' },
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
  for (const [index, item] of REAL_PRODUCT_CATALOG.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: inferCategorySlug(item) },
      update: {
        name: inferCategoryName(item),
        isActive: true,
      },
      create: {
        slug: inferCategorySlug(item),
        name: inferCategoryName(item),
        isActive: true,
      },
    });

    const brand = await prisma.brand.upsert({
      where: { slug: inferBrandSlug(item) },
      update: {
        name: inferBrandName(item),
        isActive: true,
      },
      create: {
        slug: inferBrandSlug(item),
        name: inferBrandName(item),
        isActive: true,
      },
    });

    await prisma.product.upsert({
      where: { sku: buildRealProductSku(item, index) },
      update: {
        name: item.name,
        slug: buildRealProductSlug(item, index),
        description: buildDescription(item),
        indication: item.indication,
        activeIngredient: item.activeIngredient,
        dosageForm: inferDosageForm(item),
        strength: null,
        registrationNumber: null,
        requiresPrescription: inferRequiresPrescription(item),
        unit: inferUnit(item),
        basePrice: 0,
        status: ProductStatus.ACTIVE,
        categoryId: category.id,
        brandId: brand.id,
        barcode: null,
        deletedAt: null,
      },
      create: {
        sku: buildRealProductSku(item, index),
        name: item.name,
        slug: buildRealProductSlug(item, index),
        description: buildDescription(item),
        indication: item.indication,
        activeIngredient: item.activeIngredient,
        dosageForm: inferDosageForm(item),
        strength: null,
        registrationNumber: null,
        requiresPrescription: inferRequiresPrescription(item),
        unit: inferUnit(item),
        basePrice: 0,
        status: ProductStatus.ACTIVE,
        categoryId: category.id,
        brandId: brand.id,
        barcode: null,
      },
    });
  }

  await seedProductImages();
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
