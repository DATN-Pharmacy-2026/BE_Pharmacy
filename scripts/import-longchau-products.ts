import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient, ProductStatus } from '../node_modules/.prisma/client/commerce';

type CsvRow = Record<string, string>;

const prisma = new PrismaClient();

const DEFAULT_CSV_PATH = path.resolve(
  __dirname,
  '../../tools/pharmacy_crawler/output/products_longchau_import_ready.csv',
);

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { file: string } = { file: DEFAULT_CSV_PATH };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--file' && args[i + 1]) {
      out.file = path.resolve(process.cwd(), args[i + 1]);
      i += 1;
    }
  }
  return out;
}

function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
      }
      row = [];
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: CsvRow = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? '').trim();
    });
    return obj;
  });
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function slugify(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function toBool(value: string): boolean {
  return value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
}

function mapUnit(unit: string): string {
  const u = unit.toLowerCase();
  if (u === 'box') return 'box';
  if (u === 'bottle') return 'bottle';
  if (u === 'tube') return 'tube';
  if (u === 'blister') return 'blister';
  if (u === 'pack') return 'pack';
  return 'box';
}

function mapCategorySlug(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('thuốc')) return 'medicine';
  if (n.includes('thực phẩm chức năng')) return 'functional-food';
  if (n.includes('dược mỹ phẩm')) return 'cosmetics';
  if (n.includes('thiết bị y tế')) return 'medical-equipment';
  if (n.includes('chăm sóc cá nhân')) return 'personal-care';
  return slugify(name || 'misc');
}

async function ensureCategory(name: string) {
  const slug = mapCategorySlug(name);
  const normalizedName = normalizeWhitespace(name) || slug;
  return prisma.category.upsert({
    where: { slug },
    update: { name: normalizedName, isActive: true },
    create: { slug, name: normalizedName, isActive: true },
  });
}

async function ensureBrand(name: string | null) {
  if (!name || name.toLowerCase() === 'unknown') {
    const fallbackSlug = 'default-pharma';
    return prisma.brand.upsert({
      where: { slug: fallbackSlug },
      update: { name: 'Default Pharma', isActive: true },
      create: { slug: fallbackSlug, name: 'Default Pharma', isActive: true, country: 'VN' },
    });
  }
  const normalized = normalizeWhitespace(name);
  const slug = slugify(normalized);
  return prisma.brand.upsert({
    where: { slug },
    update: { name: normalized, isActive: true },
    create: { slug, name: normalized, isActive: true },
  });
}

async function main() {
  const { file } = parseArgs();
  if (!fs.existsSync(file)) {
    throw new Error(`CSV file not found: ${file}`);
  }

  const content = fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
  const records = parseCsv(content);
  if (records.length === 0) {
    throw new Error('CSV has no data rows.');
  }

  let createdOrUpdated = 0;
  let skipped = 0;

  for (const r of records) {
    const sku = normalizeWhitespace(r.sku || '');
    const name = normalizeWhitespace(r.product_name || '');
    if (!sku || !name) {
      skipped += 1;
      continue;
    }

    const category = await ensureCategory(r.category || 'Khác');
    const brand = await ensureBrand(r.brand || null);

    const rawSlug = normalizeWhitespace(r.slug || '');
    const safeSlug = rawSlug || slugify(name);
    const safeUniqueSlug = `${safeSlug}-${sku.toLowerCase()}`;
    const basePriceNum = Number((r.base_price_vnd || '0').replace(/[^\d.-]/g, ''));
    const basePrice = Number.isFinite(basePriceNum) ? basePriceNum : 0;

    await prisma.product.upsert({
      where: { sku },
      update: {
        name,
        slug: safeUniqueSlug,
        description: normalizeWhitespace(r.description || '') || null,
        activeIngredient: normalizeWhitespace(r.active_ingredient || '') || null,
        dosageForm: normalizeWhitespace(r.dosage_form || '') || null,
        strength: normalizeWhitespace(r.strength || '') || null,
        registrationNumber: normalizeWhitespace(r.registration_number || '') || null,
        requiresPrescription: toBool(r.prescription_required || ''),
        unit: mapUnit(r.base_unit || 'box'),
        basePrice,
        status: ProductStatus.DRAFT,
        categoryId: category.id,
        brandId: brand.id,
        barcode: normalizeWhitespace(r.barcode || '') || null,
        indication: normalizeWhitespace(r.description || '').slice(0, 160) || null,
        deletedAt: null,
      },
      create: {
        sku,
        name,
        slug: safeUniqueSlug,
        description: normalizeWhitespace(r.description || '') || null,
        activeIngredient: normalizeWhitespace(r.active_ingredient || '') || null,
        dosageForm: normalizeWhitespace(r.dosage_form || '') || null,
        strength: normalizeWhitespace(r.strength || '') || null,
        registrationNumber: normalizeWhitespace(r.registration_number || '') || null,
        requiresPrescription: toBool(r.prescription_required || ''),
        unit: mapUnit(r.base_unit || 'box'),
        basePrice,
        status: ProductStatus.DRAFT,
        categoryId: category.id,
        brandId: brand.id,
        barcode: normalizeWhitespace(r.barcode || '') || null,
        indication: normalizeWhitespace(r.description || '').slice(0, 160) || null,
      },
    });

    createdOrUpdated += 1;
  }

  console.log(
    `[DONE] Imported ${createdOrUpdated} products into commerce.Product (skipped ${skipped}).`,
  );
}

main()
  .catch((error) => {
    console.error('[ERROR] import-longchau-products failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
