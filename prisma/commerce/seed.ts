import {
  CouponStatus,
  DiscountType,
  PrismaClient,
  ProductStatus,
} from '../../node_modules/.prisma/client/commerce';

const prisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;

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

async function main(): Promise<void> {
  await seedCategories();
  await seedBrands();
  await seedProducts();
  await seedCoupons();
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
