import { Injectable } from '@nestjs/common';
import { OperationClient } from '../clients/operation.client';
import { InternalChatTool, ToolInput, ToolResult } from '../intent/internal-intent.types';

@Injectable()
export class PosTool implements InternalChatTool {
  constructor(private readonly operationClient: OperationClient) {}

  async execute(input: ToolInput): Promise<ToolResult> {
    switch (input.intent) {
      case 'pos.open_session':
        return this.lookupOpenSession(input);
      case 'pos.order_lookup':
        return this.lookupPosOrder(input);
      default:
        return {
          success: false,
          type: 'pos.open_session',
          data: null,
          dataSources: [],
          warnings: ['PosTool khong ho tro intent nay.'],
        };
    }
  }

  private async lookupOpenSession(input: ToolInput): Promise<ToolResult> {
    const current = await this.operationClient.getCurrentPosSession(
      input.context,
      input.requestHeaders,
    );
    const warnings = [...current.warnings];
    const dataSources = [current.dataSource];

    if (current.item) {
      return {
        success: true,
        type: 'pos.open_session',
        data: {
          sessions: [current.item],
        },
        dataSources,
        warnings,
      };
    }

    const openSessions = await this.operationClient.getOpenPosSessions(
      input.context,
      input.requestHeaders,
    );
    dataSources.push(openSessions.dataSource);
    warnings.push(...openSessions.warnings);

    return {
      success: openSessions.items.length > 0,
      type: 'pos.open_session',
      data: {
        sessions: openSessions.items,
      },
      dataSources: this.unique(dataSources),
      warnings: this.unique(warnings),
    };
  }

  private async lookupPosOrder(input: ToolInput): Promise<ToolResult> {
    const orderNo = input.orderNo?.trim() || this.extractOrderNo(input.message);
    if (!orderNo) {
      return {
        success: false,
        type: 'pos.order_lookup',
        data: null,
        dataSources: [],
        warnings: ['Khong xac dinh duoc ma don POS can tra cuu.'],
      };
    }

    const result = await this.operationClient.getPosOrderByOrderNo(
      orderNo,
      input.context,
      input.requestHeaders,
    );

    return {
      success: Boolean(result.item),
      type: 'pos.order_lookup',
      data: {
        orderNo,
        order: result.item,
      },
      dataSources: [result.dataSource],
      warnings: this.unique(result.warnings),
    };
  }

  private extractOrderNo(message: string): string | undefined {
    return message.match(/\bPOS-[A-Z0-9-]+\b/i)?.[0]?.toUpperCase();
  }

  private unique(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
  }
}
