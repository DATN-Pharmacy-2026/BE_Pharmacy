import { PrismaClient, ProductStatus, CartStatus } from '../node_modules/.prisma/client/commerce';
import {
  REAL_PRODUCT_CATALOG,
  LEGACY_SAMPLE_PRODUCT_SKUS,
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
} from './data/real-product-catalog';

const prisma = new PrismaClient();

function buildProductImageUrl(productName: string): string {
  const label = encodeURIComponent(productName.slice(0, 28));
  return `https://placehold.co/600x600/eef7ff/0f766e/png?text=${label}`;
}

async function ensureCategory(name: string, slug: string) {
  return prisma.category.upsert({
    where: { slug },
    update: {
      name,
      isActive: true,
    },
    create: {
      name,
      slug,
      isActive: true,
    },
  });
}

async function ensureBrand(name: string, slug: string) {
  return prisma.brand.upsert({
    where: { slug },
    update: {
      name,
      isActive: true,
    },
    create: {
      name,
      slug,
      isActive: true,
    },
  });
}

async function ensureProductImage(product: { id: string; name: string }) {
  const data = {
    url: buildProductImageUrl(product.name),
    alt: product.name,
    sortOrder: 0,
  };

  const existing = await prisma.productImage.findFirst({
    where: { productId: product.id, sortOrder: 0 },
    select: { id: true },
  });

  if (existing) {
    await prisma.productImage.update({
      where: { id: existing.id },
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

async function softDeleteLegacyDemoProducts() {
  const legacyProducts = await prisma.product.findMany({
    where: {
      deletedAt: null,
      OR: [
        { sku: { startsWith: 'DEMO-PROD-' } },
        { sku: { in: LEGACY_SAMPLE_PRODUCT_SKUS } },
        { name: { startsWith: 'Demo Product ' } },
      ],
    },
    select: { id: true },
  });

  if (legacyProducts.length === 0) {
    return { products: 0, activeCartItems: 0 };
  }

  const productIds = legacyProducts.map((item) => item.id);
  const activeCartDelete = await prisma.cartItem.deleteMany({
    where: {
      productId: { in: productIds },
      cart: { status: CartStatus.ACTIVE },
    },
  });

  const productUpdate = await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data: {
      status: ProductStatus.DISCONTINUED,
      deletedAt: new Date(),
    },
  });

  return { products: productUpdate.count, activeCartItems: activeCartDelete.count };
}

async function importRealProducts() {
  let imported = 0;

  for (const [index, item] of REAL_PRODUCT_CATALOG.entries()) {
    const category = await ensureCategory(inferCategoryName(item), inferCategorySlug(item));
    const brand = await ensureBrand(inferBrandName(item), inferBrandSlug(item));
    const sku = buildRealProductSku(item, index);
    const slug = buildRealProductSlug(item, index);

    const product = await prisma.product.upsert({
      where: { sku },
      update: {
        name: item.name,
        slug,
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
        sku,
        name: item.name,
        slug,
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

    await ensureProductImage(product);
    imported += 1;
  }

  return imported;
}

async function main() {
  const cleaned = await softDeleteLegacyDemoProducts();
  const imported = await importRealProducts();

  console.log(
    `[DONE] Soft-deleted ${cleaned.products} legacy demo products, removed ${cleaned.activeCartItems} active cart items, imported ${imported} real catalog products.`,
  );
  console.log('[NEXT] Run `npm run sync:pos-inventory` if you want inventory rows for the new products.');
}

main()
  .catch((error) => {
    console.error('[ERROR] replace-demo-products failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
