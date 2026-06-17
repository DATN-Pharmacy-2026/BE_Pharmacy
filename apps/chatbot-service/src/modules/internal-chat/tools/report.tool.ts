import { Injectable } from '@nestjs/common';
import { ReportingClient } from '../clients/reporting.client';
import { InternalChatTool, ToolInput, ToolResult } from '../intent/internal-intent.types';

@Injectable()
export class ReportTool implements InternalChatTool {
  constructor(private readonly reportingClient: ReportingClient) {}

  async execute(input: ToolInput): Promise<ToolResult> {
    const result = await this.reportingClient.getDashboardOverview(
      input.context,
      input.requestHeaders,
    );

    return {
      success: Boolean(result.item),
      type: 'report.snapshot',
      data: {
        snapshot: result.item,
      },
      dataSources: [result.dataSource],
      warnings: [
        ...result.warnings,
        'So lieu lay tu dashboard snapshot, co the khong phai du lieu live.',
      ],
    };
  }
}
