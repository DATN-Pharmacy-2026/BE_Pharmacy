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
  status?: string;
  category?: { name?: string };
  images?: Array<{ url?: string }>;
};

type RankedProductCandidate = {
  product: ProductApiItem;
  score: number;
};

type BranchApiItem = {
  id: string;
  name: string;
  code?: string;
  status?: string;
  address?: string;
  phone?: string;
};

@Injectable()
export class ProductSearchService {
  private readonly logger = new Logger(ProductSearchService.name);

  constructor(private readonly httpService: HttpService) {}

  async searchProducts(
    message: string,
    branchId?: string,
  ): Promise<ChatProductSummary[]> {
    const searchPlan = this.buildSearchPlan(message);
    const collected = new Map<string, ProductApiItem>();
    const directQuery = this.extractDirectQuery(this.normalizeText(message));

    for (const plan of searchPlan) {
      const items = await this.fetchProducts(plan);
      for (const item of items) {
        collected.set(item.id, item);
      }
      if (collected.size >= 12) break;
    }

    let rankedCandidates = this.rankProductsByName(
      Array.from(collected.values()),
      directQuery || message,
    );

    if (rankedCandidates.length < 3 && directQuery) {
      const fallbackCatalog = await this.fetchProducts({
        page: 1,
        limit: 100,
        status: 'ACTIVE',
      });
      const merged = new Map<string, ProductApiItem>();
      for (const item of [...collected.values(), ...fallbackCatalog]) {
        merged.set(item.id, item);
      }
      rankedCandidates = this.rankProductsByName(
        Array.from(merged.values()),
        directQuery,
      );
    }

    if (!rankedCandidates.length) {
      return [];
    }

    const topCandidates = rankedCandidates.slice(0, 5);
    return this.resolveProducts(
      topCandidates.map((item) => item.product),
      branchId,
      new Map(topCandidates.map((item) => [item.product.id, item.score])),
    );
  }

  async searchProductsBySymptom(
    message: string,
    symptomQuery: string,
    branchId?: string,
  ): Promise<ChatProductSummary[]> {
    const searchPlan = this.buildSymptomSearchPlan(message, symptomQuery);
    const collected = new Map<string, ProductApiItem>();

    for (const plan of searchPlan) {
      const items = await this.fetchProducts(plan);
      for (const item of items) {
        collected.set(item.id, item);
      }
      if (collected.size >= 12) break;
    }

    let rankedCandidates = this.rankProductsBySymptom(
      Array.from(collected.values()),
      symptomQuery,
    );

    if (rankedCandidates.length < 3) {
      const fallbackCatalog = await this.fetchProducts({
        page: 1,
        limit: 100,
        status: 'ACTIVE',
      });
      const merged = new Map<string, ProductApiItem>();
      for (const item of [...collected.values(), ...fallbackCatalog]) {
        merged.set(item.id, item);
      }
      rankedCandidates = this.rankProductsBySymptom(
        Array.from(merged.values()),
        symptomQuery,
      );
    }

    if (!rankedCandidates.length) {
      return [];
    }

    const topCandidates = rankedCandidates.slice(0, 5);
    return this.resolveProducts(
      topCandidates.map((item) => item.product),
      branchId,
      new Map(topCandidates.map((item) => [item.product.id, item.score])),
    );
  }

  async getProductsByIds(
    productIds: string[],
    branchId?: string,
  ): Promise<ChatProductSummary[]> {
    const uniqueIds = Array.from(
      new Set(
        productIds
          .map((productId) => productId.trim())
          .filter((productId) => productId.length > 0),
      ),
    ).slice(0, 5);

    if (!uniqueIds.length) {
      return [];
    }

    const products = (
      await Promise.all(
        uniqueIds.map((productId) => this.fetchProductById(productId)),
      )
    ).filter(Boolean) as ProductApiItem[];

    if (!products.length) {
      return [];
    }

    return this.resolveProducts(products, branchId);
  }

  async searchBranches(
    message: string,
    selectedBranchId?: string,
  ): Promise<BranchApiItem[]> {
    const branches = await this.fetchActiveBranches();
    if (!branches.length) {
      return [];
    }

    if (selectedBranchId) {
      const selected = branches.find((branch) => branch.id === selectedBranchId);
      if (selected) {
        return [selected];
      }
    }

    const normalizedQuery = this.normalizeLookupQuery(message);
    if (!normalizedQuery) {
      return branches.slice(0, 3);
    }

    const tokens = normalizedQuery.split(' ').filter(Boolean);
    return branches
      .map((branch) => {
        const haystack = this.normalizeLookupQuery(
          [branch.name, branch.code, branch.address, branch.phone]
            .filter(Boolean)
            .join(' '),
        );
        let score = 0;

        if (haystack.includes(normalizedQuery)) {
          score += 25;
        }

        for (const token of tokens) {
          if (haystack.includes(token)) {
            score += token.length >= 4 ? 8 : 3;
          }
        }

        return { branch, score };
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map((item) => item.branch);
  }

  private async fetchProducts(
    params: Record<string, string | number>,
  ): Promise<ProductApiItem[]> {
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

  private async fetchProductById(productId: string): Promise<ProductApiItem | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<ProductApiItem>(
          `${this.getCommerceBaseUrl()}/api/products/${productId}`,
        ),
      );
      if (!response.data?.id) {
        return null;
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Product detail lookup failed for ${productId}: ${message}`);
      return null;
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
    matchScore?: number,
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
      matchScore,
      availableBranches,
    };
  }

  private async resolveProducts(
    products: ProductApiItem[],
    branchId?: string,
    matchScores?: Map<string, number>,
  ): Promise<ChatProductSummary[]> {
    const branches = branchId ? [] : await this.fetchActiveBranches();
    return Promise.all(
      products.map((product) =>
        this.resolveAvailability(
          product,
          branchId,
          branches,
          matchScores?.get(product.id),
        ),
      ),
    );
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
      availability.warehouses?.find(
        (warehouse: { availableQty?: number }) =>
          (warehouse.availableQty ?? 0) > 0,
      )?.name ?? 'Chi nhanh da chon';

    return [
      {
        id: branchId,
        name: branchName,
        availableQty: availability.availableQty,
      },
    ];
  }

  private async fetchAvailability(
    productId: string,
    branchId: string,
  ): Promise<any | null> {
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
      this.logger.warn(
        `Availability lookup failed for ${productId}/${branchId}: ${message}`,
      );
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
      plans.push({ ...base, search: directQuery.replace(/\s+/g, '-') });
      plans.push({ ...base, search: directQuery.replace(/-/g, ' ') });
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

  private buildSymptomSearchPlan(
    message: string,
    symptomQuery: string,
  ): Array<Record<string, string | number>> {
    const plans: Array<Record<string, string | number>> = [];
    const base = { page: 1, limit: 12, status: 'ACTIVE' };
    const normalizedMessage = this.normalizeText(message);
    const normalizedSymptom = this.normalizeText(symptomQuery || message);
    const tokens = this.tokenizeMeaningful(normalizedSymptom);
    const phrases = [
      normalizedSymptom,
      this.cleanupQuery(this.extractDirectQuery(normalizedMessage)),
      tokens.slice(0, 3).join(' '),
      tokens.slice(0, 2).join(' '),
      ...tokens,
    ]
      .map((value) => this.cleanupQuery(value))
      .filter(
        (value, index, array) =>
          value.length > 1 && array.indexOf(value) === index,
      );

    for (const phrase of phrases) {
      plans.push({ ...base, useCase: phrase });
      plans.push({ ...base, search: phrase });
      plans.push({ ...base, activeIngredient: phrase });
    }

    const deduped = new Map<string, Record<string, string | number>>();
    for (const plan of plans) {
      const key = JSON.stringify(plan);
      deduped.set(key, plan);
    }
    return Array.from(deduped.values());
  }

  private extractDirectQuery(normalized: string): string {
    return normalized
      .replace(
        /\b(bao nhieu tien|gia bao nhieu|gia cua|bao nhieu|bao tien|gia thuoc|gia|con hang|co ban|chi nhanh nao|thuoc nay|san pham nay|khong|co|hay|voi|cho toi|toi muon hoi)\b/g,
        ' ',
      )
      .replace(/\b(thuoc|san pham|mat hang)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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
      .replace(
        /\b(khong|khong a|khong vay|khong nhi|bao nhieu tien|gia bao nhieu|gia cua|bao nhieu|bao tien|gia thuoc|gia|con hang|con khong|chi nhanh nao|co ban|co thuoc|thuoc gi|nen dung|trieu chung|bi|kem)\b/g,
        ' ',
      )
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
      'neu',
      'dung',
      'nen',
      'trieu',
      'chung',
      'kem',
      'bi',
    ]);

    return normalized
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1 && !stopWords.has(token));
  }

  private normalizeText(value: string): string {
    return value
      .replace(/[đĐ]/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[-_]+/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeLookupQuery(value: string): string {
    return this.normalizeText(value)
      .replace(
        /\b(thuoc|san pham|gia|bao nhieu tien|gia bao nhieu|gia cua|bao nhieu|bao tien|co|khong|nao|nay)\b/g,
        ' ',
      )
      .replace(/\s+/g, ' ')
      .trim();
  }

  private rankProductsBySymptom(
    products: ProductApiItem[],
    symptomQuery: string,
  ): RankedProductCandidate[] {
    const normalizedSymptom = this.normalizeText(symptomQuery);
    const tokens = this.tokenizeMeaningful(normalizedSymptom);

    return products
      .map((product) => {
        const haystack = this.normalizeText(
          [
            product.name,
            product.category?.name,
            product.description,
            product.activeIngredient,
            product.indication,
          ]
            .filter(Boolean)
            .join(' '),
        );

        let score = 0;
        if (normalizedSymptom && haystack.includes(normalizedSymptom)) {
          score += 8;
        }

        for (const token of tokens) {
          if (haystack.includes(token)) {
            score += token.length >= 5 ? 3 : 1;
          }
        }

        if (
          normalizedSymptom &&
          this.normalizeText(product.indication || '').includes(
            normalizedSymptom,
          )
        ) {
          score += 4;
        }

        if (
          normalizedSymptom &&
          this.normalizeText(product.category?.name || '').includes(
            normalizedSymptom,
          )
        ) {
          score += 2;
        }

        return { product, score };
      })
      .filter((item) => item.score >= 2)
      .sort((left, right) => right.score - left.score)
      .slice(0, 12);
  }

  private rankProductsByName(
    products: ProductApiItem[],
    query: string,
  ): RankedProductCandidate[] {
    const normalizedQuery = this.normalizeLookupQuery(query);
    const queryTokens = normalizedQuery.split(' ').filter(Boolean);
    if (!normalizedQuery) {
      return [];
    }

    return products
      .map((product) => {
        const normalizedName = this.normalizeLookupQuery(product.name);
        const normalizedSlug = this.normalizeLookupQuery(product.slug || '');
        const normalizedIngredient = this.normalizeLookupQuery(
          product.activeIngredient || '',
        );

        let score = 0;
        if (normalizedName === normalizedQuery || normalizedSlug === normalizedQuery) {
          score += 100;
        }
        if (
          normalizedName.replace(/\s+/g, '') ===
            normalizedQuery.replace(/\s+/g, '') ||
          normalizedSlug.replace(/\s+/g, '') ===
            normalizedQuery.replace(/\s+/g, '')
        ) {
          score += 95;
        }
        if (normalizedName.includes(normalizedQuery)) {
          score += 45;
        }
        if (normalizedIngredient.includes(normalizedQuery)) {
          score += 35;
        }

        for (const token of queryTokens) {
          if (normalizedName.includes(token)) {
            score += token.length >= 5 ? 12 : 5;
          } else if (normalizedIngredient.includes(token)) {
            score += token.length >= 5 ? 8 : 3;
          }
        }

        if (product.status?.toUpperCase() === 'ACTIVE') {
          score += 2;
        }

        return { product, score };
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 12);
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
