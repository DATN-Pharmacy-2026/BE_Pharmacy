import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { InternalChatContext, InternalRequestHeaders } from '../intent/internal-intent.types';

interface ListResponse<T> {
  items: T[];
}

export interface OperationInventoryItem {
  id: string;
  productId: string;
  branchId?: string;
  warehouseId: string;
  batchId?: string;
  quantityOnHand?: number;
  quantityReserved?: number;
  quantityAvailable?: number;
  expiryDate?: string;
  warehouse?: { id: string; code?: string; name?: string };
  batch?: { id: string; batchNo?: string; expiryDate?: string; status?: string };
}

export interface OperationPosSession {
  id: string;
  branchId: string;
  storeId: string;
  posTerminalId: string;
  cashierUserId: string;
  openedAt: string;
  closedAt?: string | null;
  openingCash?: number;
  status: string;
  branch?: { id: string; code?: string; name?: string };
  store?: { id: string; code?: string; name?: string };
  posTerminal?: { id: string; code?: string; name?: string };
}

@Injectable()
export class OperationClient {
  private readonly logger = new Logger(OperationClient.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getInventoryByProductId(
    productId: string,
    context: InternalChatContext,
    headers: InternalRequestHeaders,
  ): Promise<{ items: OperationInventoryItem[]; dataSource: string; warnings: string[] }> {
    const dataSource = `/api/inventory/product/${productId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<ListResponse<OperationInventoryItem>>(
          `${this.getBaseUrl()}/api/inventory/product/${productId}`,
          {
            params: this.buildContextParams(context),
            headers: this.buildHeaders(headers, context),
            timeout: 5000,
          },
        ),
      );

      return { items: response.data?.items ?? [], dataSource, warnings: [] };
    } catch (error) {
      const warning = this.buildWarning(
        'getInventoryByProductId',
        dataSource,
        error,
        'Khong the lay du lieu ton kho tu operation-service.',
      );
      return {
        items: [],
        dataSource,
        warnings: [warning],
      };
    }
  }

  async searchInventory(
    query: Record<string, string | number>,
    context: InternalChatContext,
    headers: InternalRequestHeaders,
  ): Promise<{ items: OperationInventoryItem[]; dataSource: string; warnings: string[] }> {
    const dataSource = '/api/inventory';

    try {
      const response = await firstValueFrom(
        this.httpService.get<ListResponse<OperationInventoryItem>>(
          `${this.getBaseUrl()}/api/inventory`,
          {
            params: {
              ...query,
              ...this.buildContextParams(context),
            },
            headers: this.buildHeaders(headers, context),
            timeout: 5000,
          },
        ),
      );

      return { items: response.data?.items ?? [], dataSource, warnings: [] };
    } catch (error) {
      const warning = this.buildWarning(
        'searchInventory',
        dataSource,
        error,
        'Khong the tim du lieu ton kho trong operation-service.',
      );
      return {
        items: [],
        dataSource,
        warnings: [warning],
      };
    }
  }

  async getLowStock(
    context: InternalChatContext,
    headers: InternalRequestHeaders,
  ): Promise<{ items: OperationInventoryItem[]; dataSource: string; warnings: string[] }> {
    const dataSource = '/api/inventory/low-stock';

    try {
      const response = await firstValueFrom(
        this.httpService.get<ListResponse<OperationInventoryItem>>(
          `${this.getBaseUrl()}/api/inventory/low-stock`,
          {
            params: { ...this.buildContextParams(context), page: 1, limit: 5 },
            headers: this.buildHeaders(headers, context),
            timeout: 5000,
          },
        ),
      );

      return { items: response.data?.items ?? [], dataSource, warnings: [] };
    } catch (error) {
      const warning = this.buildWarning(
        'getLowStock',
        dataSource,
        error,
        'Khong the lay danh sach ton thap tu operation-service.',
      );
      return {
        items: [],
        dataSource,
        warnings: [warning],
      };
    }
  }

  async getExpiring(
    context: InternalChatContext,
    headers: InternalRequestHeaders,
  ): Promise<{ items: OperationInventoryItem[]; dataSource: string; warnings: string[] }> {
    const dataSource = '/api/inventory/expiring';

    try {
      const response = await firstValueFrom(
        this.httpService.get<ListResponse<OperationInventoryItem>>(
          `${this.getBaseUrl()}/api/inventory/expiring`,
          {
            params: { ...this.buildContextParams(context), page: 1, limit: 5 },
            headers: this.buildHeaders(headers, context),
            timeout: 5000,
          },
        ),
      );

      return { items: response.data?.items ?? [], dataSource, warnings: [] };
    } catch (error) {
      const warning = this.buildWarning(
        'getExpiring',
        dataSource,
        error,
        'Khong the lay danh sach lo gan het han tu operation-service.',
      );
      return {
        items: [],
        dataSource,
        warnings: [warning],
      };
    }
  }

  async getCurrentPosSession(
    context: InternalChatContext,
    headers: InternalRequestHeaders,
  ): Promise<{ item: OperationPosSession | null; dataSource: string; warnings: string[] }> {
    const dataSource = '/api/pos-sessions/current';

    try {
      const response = await firstValueFrom(
        this.httpService.get<OperationPosSession>(
          `${this.getBaseUrl()}/api/pos-sessions/current`,
          {
            params: context.branchId ? { branchId: context.branchId } : {},
            headers: this.buildHeaders(headers, context),
            timeout: 5000,
          },
        ),
      );

      return { item: response.data ?? null, dataSource, warnings: [] };
    } catch (error) {
      if (this.isNotFound(error)) {
        return { item: null, dataSource, warnings: [] };
      }
      const warning = this.buildWarning(
        'getCurrentPosSession',
        dataSource,
        error,
        'Khong the lay ca POS hien tai tu operation-service.',
      );
      return { item: null, dataSource, warnings: [warning] };
    }
  }

  async getOpenPosSessions(
    context: InternalChatContext,
    headers: InternalRequestHeaders,
  ): Promise<{ items: OperationPosSession[]; dataSource: string; warnings: string[] }> {
    const dataSource = '/api/pos-sessions?status=OPEN';

    try {
      const response = await firstValueFrom(
        this.httpService.get<ListResponse<OperationPosSession>>(
          `${this.getBaseUrl()}/api/pos-sessions`,
          {
            params: {
              status: 'OPEN',
              page: 1,
              limit: 5,
              ...(context.branchId ? { branchId: context.branchId } : {}),
            },
            headers: this.buildHeaders(headers, context),
            timeout: 5000,
          },
        ),
      );

      return { items: response.data?.items ?? [], dataSource, warnings: [] };
    } catch (error) {
      const warning = this.buildWarning(
        'getOpenPosSessions',
        dataSource,
        error,
        'Khong the lay thong tin ca POS tu operation-service.',
      );
      return {
        items: [],
        dataSource,
        warnings: [warning],
      };
    }
  }

  async getPosOrderByOrderNo(
    orderNo: string,
    context: InternalChatContext,
    headers: InternalRequestHeaders,
  ): Promise<{ item: Record<string, unknown> | null; dataSource: string; warnings: string[] }> {
    const dataSource = `/api/pos-orders/order-no/${encodeURIComponent(orderNo)}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<Record<string, unknown>>(
          `${this.getBaseUrl()}/api/pos-orders/order-no/${encodeURIComponent(orderNo)}`,
          {
            headers: this.buildHeaders(headers, context),
            timeout: 5000,
          },
        ),
      );

      return { item: response.data ?? null, dataSource, warnings: [] };
    } catch (error) {
      if (this.isNotFound(error)) {
        return { item: null, dataSource, warnings: [] };
      }
      const warning = this.buildWarning(
        'getPosOrderByOrderNo',
        dataSource,
        error,
        'Khong the tra cuu don POS tu operation-service.',
      );
      return { item: null, dataSource, warnings: [warning] };
    }
  }

  private getBaseUrl(): string {
    return (
      process.env.OPERATION_SERVICE_URL?.trim() ||
      this.configService.get<string>('gateway.services.operation') ||
      'http://localhost:3003'
    ).replace(/\/+$/, '');
  }

  private buildContextParams(
    context: InternalChatContext,
  ): Record<string, string> {
    return {
      ...(context.branchId ? { branchId: context.branchId } : {}),
      ...(context.warehouseId ? { warehouseId: context.warehouseId } : {}),
    };
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

  private isNotFound(error: unknown): boolean {
    return error instanceof AxiosError && error.response?.status === 404;
  }

  private buildWarning(
    operation: string,
    dataSource: string,
    error: unknown,
    userMessage: string,
  ): string {
    const detail =
      error instanceof AxiosError
        ? `status=${error.response?.status ?? 'NO_RESPONSE'}`
        : error instanceof Error
          ? error.message
          : String(error);
    this.logger.warn(`${operation} failed for ${dataSource}: ${detail}`);
    return `${userMessage} Endpoint: ${dataSource}.`;
  }
}
