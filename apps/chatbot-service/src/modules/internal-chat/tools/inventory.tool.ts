import { Injectable } from '@nestjs/common';
import { CommerceClient, CommerceProductSummary } from '../clients/commerce.client';
import { OperationClient, OperationInventoryItem } from '../clients/operation.client';
import { InternalChatTool, ToolInput, ToolResult } from '../intent/internal-intent.types';

@Injectable()
export class InventoryTool implements InternalChatTool {
  constructor(
    private readonly commerceClient: CommerceClient,
    private readonly operationClient: OperationClient,
  ) {}

  async execute(input: ToolInput): Promise<ToolResult> {
    switch (input.intent) {
      case 'inventory.lookup':
        return this.lookupInventory(input);
      case 'inventory.low_stock':
        return this.lookupLowStock(input);
      case 'inventory.expiring':
        return this.lookupExpiring(input);
      default:
        return {
          success: false,
          type: 'inventory.lookup',
          data: null,
          dataSources: [],
          warnings: ['InventoryTool khong ho tro intent nay.'],
        };
    }
  }

  private async lookupInventory(input: ToolInput): Promise<ToolResult> {
    const productResult = await this.commerceClient.searchProducts(
      input.extractedKeyword?.trim() || input.message.trim(),
      input.requestHeaders,
    );
    const dataSources = [...productResult.dataSource ? [productResult.dataSource] : []];
    const warnings = [...productResult.warnings];
    const product = productResult.items[0];

    if (!product) {
      return {
        success: false,
        type: 'inventory.lookup',
        data: {
          keyword: input.extractedKeyword?.trim() || input.message.trim(),
          product: null,
          inventoryItems: [],
          totalAvailable: 0,
        },
        dataSources,
        warnings,
      };
    }

    const inventoryResult = await this.operationClient.getInventoryByProductId(
      product.id,
      input.context,
      input.requestHeaders,
    );
    dataSources.push(inventoryResult.dataSource);
    warnings.push(...inventoryResult.warnings);

    const totalAvailable = inventoryResult.items.reduce(
      (sum, item) => sum + Number(item.quantityAvailable ?? 0),
      0,
    );

    return {
      success: true,
      type: 'inventory.lookup',
      data: {
        keyword: input.extractedKeyword?.trim() || input.message.trim(),
        product,
        inventoryItems: inventoryResult.items,
        totalAvailable,
      },
      dataSources: this.unique(dataSources),
      warnings: this.unique(warnings),
    };
  }

  private async lookupLowStock(input: ToolInput): Promise<ToolResult> {
    const lowStockResult = await this.operationClient.getLowStock(
      input.context,
      input.requestHeaders,
    );
    const dataSources = [lowStockResult.dataSource];
    const warnings = [...lowStockResult.warnings];
    const threshold = 10;
    const productResolution = await this.resolveProductsByIds(
      lowStockResult.items.map((item) => item.productId),
      input,
    );
    dataSources.push(...productResolution.dataSources);
    warnings.push(...productResolution.warnings);

    const items = lowStockResult.items.slice(0, 5).map((item) =>
      this.enrichInventoryItem(item, productResolution.productMap, threshold),
    );

    return {
      success: items.length > 0,
      type: 'inventory.low_stock',
      data: {
        items,
        threshold,
      },
      dataSources: this.unique(dataSources),
      warnings: this.unique(warnings),
    };
  }

  private async lookupExpiring(input: ToolInput): Promise<ToolResult> {
    const expiringResult = await this.operationClient.getExpiring(
      input.context,
      input.requestHeaders,
    );
    const productResolution = await this.resolveProductsByIds(
      expiringResult.items.map((item) => item.productId),
      input,
    );

    return {
      success: expiringResult.items.length > 0,
      type: 'inventory.expiring',
      data: {
        items: expiringResult.items
          .slice(0, 5)
          .map((item) =>
            this.enrichInventoryItem(item, productResolution.productMap),
          ),
      },
      dataSources: this.unique([
        expiringResult.dataSource,
        ...productResolution.dataSources,
      ]),
      warnings: this.unique([
        ...expiringResult.warnings,
        ...productResolution.warnings,
      ]),
    };
  }

  private async resolveProductsByIds(
    productIds: string[],
    input: ToolInput,
  ): Promise<{
    productMap: Record<string, CommerceProductSummary>;
    dataSources: string[];
    warnings: string[];
  }> {
    const uniqueIds = [...new Set(productIds.filter(Boolean))];
    const productMap: Record<string, CommerceProductSummary> = {};
    const dataSources: string[] = [];
    const warnings: string[] = [];

    await Promise.all(
      uniqueIds.map(async (productId) => {
        const result = await this.commerceClient.getProductById(
          productId,
          input.requestHeaders,
        );
        dataSources.push(result.dataSource);
        warnings.push(...result.warnings);

        if (result.item) {
          productMap[productId] = result.item;
          return;
        }

        warnings.push(
          `Khong resolve duoc ten san pham cho productId ${productId}.`,
        );
      }),
    );

    return {
      productMap,
      dataSources: this.unique(dataSources),
      warnings: this.unique(warnings),
    };
  }

  private enrichInventoryItem(
    item: OperationInventoryItem,
    productMap: Record<string, CommerceProductSummary>,
    threshold?: number,
  ): Record<string, unknown> {
    const productId = String(item.productId ?? '');
    const product = productMap[productId];

    return {
      ...item,
      product,
      productName: product?.name ?? 'San pham chua xac dinh',
      productSku: product?.sku ?? null,
      productBarcode: product?.barcode ?? null,
      productUnit: product?.unit ?? null,
      minStockLevel:
        product?.minStockLevel ?? threshold ?? null,
    };
  }

  private unique(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
  }
}
