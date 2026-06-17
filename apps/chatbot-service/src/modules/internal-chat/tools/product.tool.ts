import { Injectable } from '@nestjs/common';
import { CommerceClient } from '../clients/commerce.client';
import { InternalChatTool, ToolInput, ToolResult } from '../intent/internal-intent.types';

@Injectable()
export class ProductTool implements InternalChatTool {
  constructor(private readonly commerceClient: CommerceClient) {}

  async execute(input: ToolInput): Promise<ToolResult> {
    const warnings: string[] = [];
    const dataSources: string[] = [];

    const keyword = input.extractedKeyword?.trim() || input.message.trim();
    if (!keyword) {
      return {
        success: false,
        type: input.intent === 'product.price' ? 'product.price' : 'product.lookup',
        data: null,
        dataSources,
        warnings: ['Khong xac dinh duoc tu khoa san pham can tim.'],
      };
    }

    const searchResult = await this.commerceClient.searchProducts(
      keyword,
      input.requestHeaders,
    );
    dataSources.push(searchResult.dataSource);
    warnings.push(...searchResult.warnings);

    let items = searchResult.items;
    if (items.length === 0) {
      const skuResult = await this.commerceClient.getProductBySku(
        keyword,
        input.requestHeaders,
      );
      dataSources.push(skuResult.dataSource);
      warnings.push(...skuResult.warnings);
      if (skuResult.item) {
        items = [skuResult.item];
      }
    }

    if (items.length === 0) {
      const barcodeResult = await this.commerceClient.getProductByBarcode(
        keyword,
        input.requestHeaders,
      );
      dataSources.push(barcodeResult.dataSource);
      warnings.push(...barcodeResult.warnings);
      if (barcodeResult.item) {
        items = [barcodeResult.item];
      }
    }

    return {
      success: items.length > 0,
      type: input.intent === 'product.price' ? 'product.price' : 'product.lookup',
      data: {
        keyword,
        items,
      },
      dataSources: this.unique(dataSources),
      warnings: this.unique(warnings),
    };
  }

  private unique(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
  }
}
