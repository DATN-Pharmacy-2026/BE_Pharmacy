import { Injectable } from '@nestjs/common';
import { CommerceClient } from '../clients/commerce.client';
import { ToolInput, ToolResult, InternalChatTool } from '../intent/internal-intent.types';

@Injectable()
export class OrderTool implements InternalChatTool {
  constructor(private readonly commerceClient: CommerceClient) {}

  async execute(input: ToolInput): Promise<ToolResult> {
    const dataSources: string[] = [];
    const warnings: string[] = [];
    const orderNo = input.orderNo?.trim() || this.extractOrderNo(input.message);

    if (!orderNo) {
      return {
        success: false,
        type: input.intent === 'order.status' ? 'order.status' : 'order.lookup',
        data: null,
        dataSources,
        warnings: ['Khong xac dinh duoc ma don online can tra cuu.'],
      };
    }

    const orderResult = await this.commerceClient.getOrderByOrderNo(
      orderNo,
      input.requestHeaders,
    );
    dataSources.push(orderResult.dataSource);
    warnings.push(...orderResult.warnings);

    return {
      success: Boolean(orderResult.item),
      type: input.intent === 'order.status' ? 'order.status' : 'order.lookup',
      data: {
        orderNo,
        order: orderResult.item,
      },
      dataSources: this.unique(dataSources),
      warnings: this.unique(warnings),
    };
  }

  private extractOrderNo(message: string): string | undefined {
    return message.match(/\bORD-[A-Z0-9-]+\b/i)?.[0]?.toUpperCase();
  }

  private unique(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
  }
}
