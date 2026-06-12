import {
  REAL_PRODUCT_CATALOG,
  buildRealProductSku,
  buildRealProductSlug,
  inferBrandName,
  inferCategoryName,
} from './real-product-catalog';

export interface PharmacyProductSeedItem {
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'DISCONTINUED';
  description: string;
  basePrice: number;
  baseUnit: string;
  activeIngredient?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  registrationNumber?: string | null;
  requiresPrescription: boolean;
  classification: string;
  categoryName: string;
  brandName: string;
  origin?: string | null;
  imageUrl?: string | null;
  sku: string;
  barcode?: string | null;
  initialStock: {
    enabled: boolean;
    branchName: string;
    warehouseName: string;
    supplierName: string;
    lotCode: string;
    quantity: number;
    minStock: number;
    manufacturingDate: string;
    expiryDate: string;
    costPrice: number;
  };
}

const DEFAULT_BRANCH_NAME = 'Main Branch';
const DEFAULT_WAREHOUSE_NAME = 'Main Branch Warehouse';
const DEFAULT_SUPPLIER_NAME = 'Default Supplier';
const DEFAULT_MFG_DATE = '2026-06-01';
const DEFAULT_EXPIRY_DATE = '2027-06-12';

function inferBaseUnit(name: string, classification: string, dosageForm?: string | null): string {
  const text = `${name} ${classification} ${dosageForm || ''}`.toLowerCase();
  if (text.includes('gel') || text.includes('cream')) return 'Tube';
  if (text.includes('spray') || text.includes('drops')) return 'Bottle';
  if (text.includes('inhaler')) return 'Pcs';
  if (text.includes('sachet') || text.includes('oresol') || text.includes('smecta')) return 'Sachet';
  if (text.includes('capsule')) return 'Capsule';
  return 'Box';
}

function inferDosageForm(name: string, classification: string): string {
  const text = `${name} ${classification}`.toLowerCase();
  if (text.includes('gel')) return 'Gel';
  if (text.includes('cream')) return 'Cream';
  if (text.includes('spray') && text.includes('nasal')) return 'Nasal Spray';
  if (text.includes('eye drops')) return 'Eye Drops';
  if (text.includes('drops')) return 'Drops';
  if (text.includes('inhaler')) return 'Injection';
  if (text.includes('effervescent')) return 'Effervescent Tablet';
  if (text.includes('syrup')) return 'Syrup';
  if (text.includes('powder') || text.includes('oresol') || text.includes('smecta')) return 'Powder';
  if (text.includes('capsule')) return 'Capsule';
  return 'Tablet';
}

function inferOrigin(index: number): string {
  const origins = ['Việt Nam', 'Pháp', 'Đức', 'Mỹ', 'Nhật Bản'];
  return origins[index % origins.length];
}

function inferStrength(activeIngredient: string, dosageForm: string, index: number): string | null {
  const text = activeIngredient.toLowerCase();
  if (!activeIngredient.trim()) return null;
  if (dosageForm === 'Nasal Spray' || dosageForm === 'Eye Drops' || dosageForm === 'Drops') return '0.05%';
  if (dosageForm === 'Gel' || dosageForm === 'Cream') return '1%';
  if (text.includes('paracetamol')) return '500mg';
  if (text.includes('ibuprofen')) return '200mg';
  if (text.includes('cetirizine')) return '10mg';
  if (text.includes('loratadine')) return '10mg';
  if (text.includes('desloratadine')) return '5mg';
  if (text.includes('fexofenadine')) return '180mg';
  if (text.includes('ambroxol')) return '30mg';
  if (text.includes('bromhexine')) return '8mg';
  if (text.includes('dextromethorphan')) return '15mg';
  if (text.includes('acetylcysteine')) return '200mg';
  if (text.includes('omeprazole') || text.includes('esomeprazole') || text.includes('pantoprazole')) return '20mg';
  if (text.includes('metformin')) return '500mg';
  if (text.includes('amlodipine')) return '5mg';
  if (text.includes('losartan')) return '50mg';
  if (text.includes('atorvastatin')) return '10mg';
  if (text.includes('simvastatin')) return '20mg';
  if (text.includes('amoxicillin')) return '500mg';
  if (text.includes('azithromycin')) return '500mg';
  if (text.includes('cefixime')) return '200mg';
  if (text.includes('ciprofloxacin')) return '500mg';
  if (text.includes('doxycycline')) return '100mg';
  if (text.includes('metronidazole')) return '250mg';
  return `${100 + (index % 5) * 50}mg`;
}

function inferRegistrationNumber(index: number): string {
  return `VD-${String(26000 + index).padStart(5, '0')}-26`;
}

function inferPrice(index: number, classification: string): number {
  const text = classification.toLowerCase();
  if (text.includes('kháng sinh')) return 68000 + index * 1000;
  if (text.includes('hạ huyết áp') || text.includes('đái tháo đường') || text.includes('hạ lipid máu')) return 95000 + index * 1200;
  if (text.includes('giãn phế quản') || text.includes('corticoid hít')) return 135000 + index * 1800;
  if (text.includes('kháng histamine')) return 42000 + index * 900;
  if (text.includes('giảm đau') || text.includes('nsaid')) return 28000 + index * 800;
  if (text.includes('sát khuẩn') || text.includes('ngoài da')) return 38000 + index * 700;
  return 55000 + index * 950;
}

function inferRequiresPrescription(classification: string, description: string): boolean {
  const text = `${classification} ${description}`.toLowerCase();
  return [
    'kháng sinh',
    'đái tháo đường',
    'hạ huyết áp',
    'hạ lipid máu',
    'giãn phế quản',
    'corticoid hít',
    'theo đơn',
    'kê đơn',
  ].some((token) => text.includes(token));
}

export const pharmacySeedProducts: PharmacyProductSeedItem[] = REAL_PRODUCT_CATALOG.map((item, index) => {
  const dosageForm = inferDosageForm(item.name, item.group);
  const slug = buildRealProductSlug(item, index);
  const sku = buildRealProductSku(item, index);
  const classification = item.group;
  const basePrice = inferPrice(index, classification);
  const origin = inferOrigin(index);
  const description = [
    item.indication,
    `Cách dùng: ${item.usage}.`,
    `Lưu ý: ${item.caution}.`,
    `Bảo quản: ${item.storage}.`,
    `Phân loại: ${classification}.`,
    `Xuất xứ: ${origin}.`,
  ].join(' ');
  const requiresPrescription = inferRequiresPrescription(classification, description);

  return {
    name: item.name,
    slug,
    status: 'ACTIVE',
    description,
    basePrice,
    baseUnit: inferBaseUnit(item.name, item.group, dosageForm),
    activeIngredient: item.activeIngredient || null,
    dosageForm,
    strength: inferStrength(item.activeIngredient, dosageForm, index),
    registrationNumber: inferRegistrationNumber(index + 1),
    requiresPrescription,
    classification,
    categoryName: inferCategoryName(item),
    brandName: inferBrandName(item),
    origin,
    imageUrl: `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1710000000/pharmacy/${slug}.jpg`,
    sku,
    barcode: `893260612${String(index + 1).padStart(4, '0')}`,
    initialStock: {
      enabled: true,
      branchName: DEFAULT_BRANCH_NAME,
      warehouseName: DEFAULT_WAREHOUSE_NAME,
      supplierName: DEFAULT_SUPPLIER_NAME,
      lotCode: `LOT-20260612-${String(index + 1).padStart(3, '0')}`,
      quantity: 20 + (index % 6) * 5,
      minStock: 10,
      manufacturingDate: DEFAULT_MFG_DATE,
      expiryDate: DEFAULT_EXPIRY_DATE,
      costPrice: Math.max(0, Math.round(basePrice * 0.7)),
    },
  };
});
