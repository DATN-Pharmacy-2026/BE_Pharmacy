import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ChatProductSummary } from './dto/chat.dto';

type ProductApiItem = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  activeIngredient?: string;
  indication?: string;
  requiresPrescription?: boolean;
  basePrice?: number;
  category?: { name?: string };
  images?: Array<{ url?: string }>;
};

type BranchApiItem = {
  id: string;
  name: string;
  code?: string;
  status?: string;
};

@Injectable()
export class ProductSearchService {
  private readonly logger = new Logger(ProductSearchService.name);

  constructor(private readonly httpService: HttpService) {}

  async searchProducts(message: string, branchId?: string): Promise<ChatProductSummary[]> {
    const searchPlan = this.buildSearchPlan(message);
    const collected = new Map<string, ProductApiItem>();

    for (const plan of searchPlan) {
      const items = await this.fetchProducts(plan);
      for (const item of items) {
        collected.set(item.id, item);
      }
      if (collected.size >= 5) break;
    }

    const products = Array.from(collected.values()).slice(0, 5);
    if (products.length === 0) {
      return [];
    }

    const branches = branchId ? [] : await this.fetchActiveBranches();
    const availability = await Promise.all(
      products.map((product) => this.resolveAvailability(product, branchId, branches)),
    );

    return availability;
  }

  private async fetchProducts(params: Record<string, string | number>): Promise<ProductApiItem[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ items?: ProductApiItem[] }>(
          `${this.getCommerceBaseUrl()}/api/products`,
          { params },
        ),
      );
      return response.data?.items ?? [];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Product search request failed: ${message}`);
      return [];
    }
  }

  private async fetchActiveBranches(): Promise<BranchApiItem[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ items?: BranchApiItem[] }>(
          `${this.getOperationBaseUrl()}/api/branches`,
          {
            params: {
              page: 1,
              limit: 50,
              status: 'ACTIVE',
            },
          },
        ),
      );
      return (response.data?.items ?? []).filter(
        (branch) => (branch.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Branch lookup failed: ${message}`);
      return [];
    }
  }

  private async resolveAvailability(
    product: ProductApiItem,
    selectedBranchId: string | undefined,
    branches: BranchApiItem[],
  ): Promise<ChatProductSummary> {
    const availableBranches = selectedBranchId
      ? await this.fetchAvailabilityForBranch(product.id, selectedBranchId)
      : await this.fetchAvailabilityAcrossBranches(product.id, branches);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.basePrice ?? 0),
      category: product.category?.name,
      activeIngredient: product.activeIngredient,
      description: product.description,
      usage: product.indication,
      imageUrl: product.images?.[0]?.url,
      requiresPrescription: Boolean(product.requiresPrescription),
      isAvailable: availableBranches.length > 0,
      availableBranches,
    };
  }

  private async fetchAvailabilityAcrossBranches(
    productId: string,
    branches: BranchApiItem[],
  ): Promise<Array<{ id: string; name: string; code?: string; availableQty: number }>> {
    const checks = await Promise.all(
      branches.map(async (branch) => {
        const availability = await this.fetchAvailability(productId, branch.id);
        if (!availability || availability.availableQty <= 0) {
          return null;
        }
        return {
          id: branch.id,
          name: branch.name,
          code: branch.code,
          availableQty: availability.availableQty,
        };
      }),
    );

    return checks.filter(Boolean).slice(0, 3) as Array<{
      id: string;
      name: string;
      code?: string;
      availableQty: number;
    }>;
  }

  private async fetchAvailabilityForBranch(
    productId: string,
    branchId: string,
  ): Promise<Array<{ id: string; name: string; code?: string; availableQty: number }>> {
    const availability = await this.fetchAvailability(productId, branchId);
    if (!availability || availability.availableQty <= 0) {
      return [];
    }

    const branchName =
      availability.warehouses?.find((warehouse: { availableQty?: number }) => (warehouse.availableQty ?? 0) > 0)
        ?.name ?? 'Chi nhánh đã chọn';

    return [
      {
        id: branchId,
        name: branchName,
        availableQty: availability.availableQty,
      },
    ];
  }

  private async fetchAvailability(productId: string, branchId: string): Promise<any | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.getOperationBaseUrl()}/api/public-inventory/availability`,
          {
            params: {
              productId,
              branchId,
              quantity: 1,
            },
          },
        ),
      );
      return response.data ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Availability lookup failed for ${productId}/${branchId}: ${message}`);
      return null;
    }
  }

  private buildSearchPlan(message: string): Array<Record<string, string | number>> {
    const plans: Array<Record<string, string | number>> = [];
    const base = { page: 1, limit: 8, status: 'ACTIVE' };
    const normalized = this.normalizeText(message);

    const directQuery = this.extractDirectQuery(normalized);
    if (directQuery) {
      plans.push({ ...base, search: directQuery });
    }

    const activeIngredient = this.extractAfterKeyword(normalized, [
      'hoat chat',
      'chua hoat chat',
    ]);
    if (activeIngredient) {
      plans.push({ ...base, activeIngredient });
      plans.push({ ...base, search: activeIngredient });
    }

    const useCase = this.extractUseCase(normalized);
    if (useCase) {
      plans.push({ ...base, useCase });
      plans.push({ ...base, search: useCase });
    }

    const phraseTokens = this.tokenizeMeaningful(normalized);
    if (phraseTokens.length >= 2) {
      plans.push({ ...base, search: phraseTokens.slice(0, 4).join(' ') });
    }
    if (phraseTokens.length >= 1) {
      plans.push({ ...base, search: phraseTokens.slice(0, 2).join(' ') });
    }

    const deduped = new Map<string, Record<string, string | number>>();
    for (const plan of plans) {
      const key = JSON.stringify(plan);
      deduped.set(key, plan);
    }
    return Array.from(deduped.values());
  }

  private extractDirectQuery(normalized: string): string {
    const stripped = normalized
      .replace(/\b(bao nhieu|gia|con hang|co ban|chi nhanh nao|thuoc nay|san pham nay|khong|co|hay|voi|cho toi|toi muon hoi)\b/g, ' ')
      .replace(/\b(thuoc|san pham|mat hang)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return stripped;
  }

  private extractAfterKeyword(normalized: string, keywords: string[]): string {
    for (const keyword of keywords) {
      const marker = `${keyword} `;
      const index = normalized.indexOf(marker);
      if (index >= 0) {
        const value = normalized.slice(index + marker.length).trim();
        return this.cleanupQuery(value);
      }
    }
    return '';
  }

  private extractUseCase(normalized: string): string {
    const match = normalized.match(/\b(tri|chua|ho tro)\s+(.+)$/);
    if (!match) {
      return '';
    }
    return this.cleanupQuery(match[2] ?? '');
  }

  private cleanupQuery(value: string): string {
    return value
      .replace(/\b(khong|khong a|khong vay|khong nhi|bao nhieu|gia|con hang|chi nhanh nao|co ban)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenizeMeaningful(normalized: string): string[] {
    const stopWords = new Set([
      'thuoc',
      'san',
      'pham',
      'co',
      'ban',
      'khong',
      'gia',
      'bao',
      'nhieu',
      'tien',
      'nay',
      'nao',
      'con',
      'hang',
      'chi',
      'nhanh',
      'gi',
      'la',
      'cua',
      'cho',
      'toi',
      'can',
      'tim',
      'kiem',
      'he',
      'thong',
    ]);

    return normalized
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1 && !stopWords.has(token));
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getCommerceBaseUrl(): string {
    return (
      process.env.COMMERCE_SERVICE_URL?.trim() ||
      process.env.CHATBOT_GATEWAY_BASE_URL?.trim() ||
      'http://localhost:3000'
    );
  }

  private getOperationBaseUrl(): string {
    return (
      process.env.OPERATION_SERVICE_URL?.trim() ||
      process.env.CHATBOT_GATEWAY_BASE_URL?.trim() ||
      'http://localhost:3000'
    );
  }
}
