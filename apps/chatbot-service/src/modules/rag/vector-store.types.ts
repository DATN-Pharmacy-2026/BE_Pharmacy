export interface VectorPayload {
  id: string;
  title: string;
  category: string;
  source: string;
  chunkIndex: number;
  content: string;
  type?: string;
  productId?: string;
  name?: string;
  sku?: string;
  brand?: string;
  [key: string]: unknown;
}

export interface SimilarSearchResult {
  id: string;
  score: number;
  source: string;
  title: string;
  content: string;
  category: string;
  chunkIndex: number;
  payload?: VectorPayload;
}
