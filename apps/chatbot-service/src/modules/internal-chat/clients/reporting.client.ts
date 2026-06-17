import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { InternalChatContext, InternalRequestHeaders } from '../intent/internal-intent.types';

@Injectable()
export class ReportingClient {
  private readonly logger = new Logger(ReportingClient.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getDashboardOverview(
    context: InternalChatContext,
    headers: InternalRequestHeaders,
  ): Promise<{
    item: Record<string, unknown> | null;
    dataSource: string;
    warnings: string[];
  }> {
    const dataSource = '/api/dashboard/overview';

    try {
      const response = await firstValueFrom(
        this.httpService.get<Record<string, unknown>>(
          `${this.getBaseUrl()}/api/dashboard/overview`,
          {
            params: {
              ...(context.branchId ? { branchId: context.branchId } : {}),
              ...(context.warehouseId ? { warehouseId: context.warehouseId } : {}),
            },
            headers: this.buildHeaders(headers, context),
            timeout: 5000,
          },
        ),
      );

      return { item: response.data ?? null, dataSource, warnings: [] };
    } catch (error) {
      const detail =
        error instanceof AxiosError
          ? `status=${error.response?.status ?? 'NO_RESPONSE'}`
          : error instanceof Error
            ? error.message
            : String(error);
      this.logger.warn(
        `getDashboardOverview failed for ${dataSource}: ${detail}`,
      );
      return {
        item: null,
        dataSource,
        warnings: [
          `Khong the lay du lieu dashboard tu reporting-setting-service. Endpoint: ${dataSource}.`,
        ],
      };
    }
  }

  private getBaseUrl(): string {
    return (
      process.env.REPORTING_SERVICE_URL?.trim() ||
      process.env.REPORTING_SETTING_SERVICE_URL?.trim() ||
      this.configService.get<string>('gateway.services.reportingSetting') ||
      'http://localhost:3004'
    ).replace(/\/+$/, '');
  }

  private buildHeaders(
    headers: InternalRequestHeaders,
    context: InternalChatContext,
  ): Record<string, string> {
    const nextHeaders: Record<string, string> = {};

    if (headers.authorization) {
      nextHeaders.authorization = headers.authorization;
    }
    if (headers.correlationId) {
      nextHeaders['x-correlation-id'] = headers.correlationId;
    }
    if (headers.requestId) {
      nextHeaders['x-request-id'] = headers.requestId;
    }
    if (context.branchId) {
      nextHeaders['x-branch-id'] = context.branchId;
    }
    if (context.warehouseId) {
      nextHeaders['x-warehouse-id'] = context.warehouseId;
    }

    return nextHeaders;
  }
}
