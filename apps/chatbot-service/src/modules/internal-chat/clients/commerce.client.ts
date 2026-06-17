import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InternalChatContext, InternalRequestHeaders } from '../intent/internal-intent.types';

export interface CommerceProductSummary {
  id: string;
  sku?: string;
  barcode?: string;
  name: string;
  description?: string;
  activeIngredient?: string;
  indication?: string;
  status?: string;
  basePrice?: number;
  unit?: string;
  minStockLevel?: number;
  category?: { id?: string; name?: string; slug?: string };
}

export interface CommerceOrderSummary {
  id: string;
  orderNo: string;
  branchId?: string | null;
  assignedWarehouseId?: string | null;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  grandTotal?: number;
  customerName?: string | null;
  customerPhone?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ListResponse<T> {
  items: T[];
}

@Injectable()
export class CommerceClient {
  private readonly logger = new Logger(CommerceClient.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async searchProducts(
    keyword: string,
    headers: InternalRequestHeaders,
  ): Promise<{ items: CommerceProductSummary[]; dataSource: string; warnings: string[] }> {
    const params = { search: keyword, page: 1, limit: 5 };
    const dataSource = `/api/products?search=${encodeURIComponent(keyword)}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<ListResponse<CommerceProductSummary>>(
          `${this.getBaseUrl()}/api/products`,
          {
            params,
            headers: this.buildHeaders(headers),
            timeout: 5000,
          },
        ),
      );

      return {
        items: response.data?.items ?? [],
        dataSource,
        warnings: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`searchProducts failed: ${message}`);
      return {
        items: [],
        dataSource,
        warnings: ['Khong the lay du lieu san pham tu commerce-service.'],
      };
    }
  }

  async getProductBySku(
    sku: string,
    headers: InternalRequestHeaders,
  ): Promise<{ item: CommerceProductSummary | null; dataSource: string; warnings: string[] }> {
    const dataSource = `/api/products/sku/${encodeURIComponent(sku)}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<CommerceProductSummary>(
          `${this.getBaseUrl()}/api/products/sku/${encodeURIComponent(sku)}`,
          {
            headers: this.buildHeaders(headers),
            timeout: 5000,
          },
        ),
      );

      return { item: response.data ?? null, dataSource, warnings: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`getProductBySku failed: ${message}`);
      return { item: null, dataSource, warnings: [] };
    }
  }

  async getProductByBarcode(
    barcode: string,
    headers: InternalRequestHeaders,
  ): Promise<{ item: CommerceProductSummary | null; dataSource: string; warnings: string[] }> {
    const dataSource = `/api/products/barcode/${encodeURIComponent(barcode)}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<CommerceProductSummary>(
          `${this.getBaseUrl()}/api/products/barcode/${encodeURIComponent(barcode)}`,
          {
            headers: this.buildHeaders(headers),
            timeout: 5000,
          },
        ),
      );

      return { item: response.data ?? null, dataSource, warnings: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`getProductByBarcode failed: ${message}`);
      return { item: null, dataSource, warnings: [] };
    }
  }

  async getProductById(
    productId: string,
    headers: InternalRequestHeaders,
  ): Promise<{ item: CommerceProductSummary | null; dataSource: string; warnings: string[] }> {
    const dataSource = `/api/products/${encodeURIComponent(productId)}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<CommerceProductSummary>(
          `${this.getBaseUrl()}/api/products/${encodeURIComponent(productId)}`,
          {
            headers: this.buildHeaders(headers),
            timeout: 5000,
          },
        ),
      );

      return { item: response.data ?? null, dataSource, warnings: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`getProductById failed: ${message}`);
      return { item: null, dataSource, warnings: [] };
    }
  }

  async getOrderByOrderNo(
    orderNo: string,
    headers: InternalRequestHeaders,
  ): Promise<{ item: Record<string, unknown> | null; dataSource: string; warnings: string[] }> {
    const dataSource = `/api/orders/order-no/${encodeURIComponent(orderNo)}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<Record<string, unknown>>(
          `${this.getBaseUrl()}/api/orders/order-no/${encodeURIComponent(orderNo)}`,
          {
            headers: this.buildHeaders(headers),
            timeout: 5000,
          },
        ),
      );

      return { item: response.data ?? null, dataSource, warnings: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`getOrderByOrderNo failed: ${message}`);
      return { item: null, dataSource, warnings: [] };
    }
  }

  async searchOrders(
    query: Record<string, string | number>,
    headers: InternalRequestHeaders,
    context: InternalChatContext,
  ): Promise<{ items: CommerceOrderSummary[]; dataSource: string; warnings: string[] }> {
    const params = {
      ...query,
      ...(context.branchId ? { branchId: context.branchId } : {}),
      ...(context.warehouseId ? { assignedWarehouseId: context.warehouseId } : {}),
    };
    const dataSource = '/api/orders';

    try {
      const response = await firstValueFrom(
        this.httpService.get<ListResponse<CommerceOrderSummary>>(
          `${this.getBaseUrl()}/api/orders`,
          {
            params,
            headers: this.buildHeaders(headers, context),
            timeout: 5000,
          },
        ),
      );

      return { items: response.data?.items ?? [], dataSource, warnings: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`searchOrders failed: ${message}`);
      return {
        items: [],
        dataSource,
        warnings: ['Khong the lay du lieu don online tu commerce-service.'],
      };
    }
  }

  private getBaseUrl(): string {
    return (
      process.env.COMMERCE_SERVICE_URL?.trim() ||
      this.configService.get<string>('gateway.services.commerce') ||
      'http://localhost:3002'
    ).replace(/\/+$/, '');
  }

  private buildHeaders(
    headers: InternalRequestHeaders,
    context?: InternalChatContext,
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
    if (context?.branchId) {
      nextHeaders['x-branch-id'] = context.branchId;
    }
    if (context?.warehouseId) {
      nextHeaders['x-warehouse-id'] = context.warehouseId;
    }

    return nextHeaders;
  }
}
