import { Injectable } from '@nestjs/common';
import { OrderTool } from './order.tool';
import { PosTool } from './pos.tool';
import { ProductTool } from './product.tool';
import { InventoryTool } from './inventory.tool';
import { ReportTool } from './report.tool';
import { ToolInput, ToolResult } from '../intent/internal-intent.types';

@Injectable()
export class ToolRouterService {
  constructor(
    private readonly productTool: ProductTool,
    private readonly inventoryTool: InventoryTool,
    private readonly orderTool: OrderTool,
    private readonly posTool: PosTool,
    private readonly reportTool: ReportTool,
  ) {}

  async execute(input: ToolInput): Promise<ToolResult[]> {
    switch (input.intent) {
      case 'product.lookup':
      case 'product.price':
        return [await this.productTool.execute(input)];
      case 'inventory.lookup':
      case 'inventory.low_stock':
      case 'inventory.expiring':
        return [await this.inventoryTool.execute(input)];
      case 'pos.open_session':
      case 'pos.order_lookup':
        return [await this.posTool.execute(input)];
      case 'report.snapshot':
        return [await this.reportTool.execute(input)];
      case 'order.lookup':
      case 'order.status':
        return this.executeOrderLookup(input);
      case 'unknown':
      default:
        return [];
    }
  }

  private async executeOrderLookup(input: ToolInput): Promise<ToolResult[]> {
    const onlineResult = await this.orderTool.execute(input);
    if (onlineResult.success) {
      return [onlineResult];
    }

    const posResult = await this.posTool.execute({
      ...input,
      intent: 'pos.order_lookup',
    });

    return [onlineResult, posResult];
  }
}
