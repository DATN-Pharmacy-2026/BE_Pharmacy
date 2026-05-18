export interface InventoryLowStockDetectedPayload {
  productId: string;
  sku?: string | null;
  branchId?: string | null;
  warehouseId?: string | null;
  currentQuantity: number;
  thresholdQuantity: number;
  detectedAt: string;
}

export interface BatchExpiringDetectedPayload {
  productId: string;
  batchId: string;
  batchCode?: string | null;
  branchId?: string | null;
  warehouseId?: string | null;
  expiryDate: string;
  detectedAt: string;
}
