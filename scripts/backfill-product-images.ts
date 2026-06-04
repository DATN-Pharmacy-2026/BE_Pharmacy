import { PrismaClient } from '../node_modules/.prisma/client/commerce';

const prisma = new PrismaClient();

function buildProductImageUrl(productName: string): string {
  const label = encodeURIComponent(productName.slice(0, 28));
  return `https://placehold.co/600x600/eef7ff/0f766e/png?text=${label}`;
}

async function main() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });

  let created = 0;
  let updated = 0;

  for (const product of products) {
    const existingImage = await prisma.productImage.findFirst({
      where: { productId: product.id, sortOrder: 0 },
      select: { id: true },
    });
    const data = {
      url: buildProductImageUrl(product.name),
      alt: product.name,
      sortOrder: 0,
    };

    if (existingImage) {
      await prisma.productImage.update({
        where: { id: existingImage.id },
        data,
      });
      updated += 1;
      continue;
    }

    await prisma.productImage.create({
      data: {
        productId: product.id,
        ...data,
      },
    });
    created += 1;
  }

  console.log(`[DONE] Backfilled product images: ${created} created, ${updated} updated.`);
}

main()
  .catch((error) => {
    console.error('[ERROR] backfill-product-images failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
