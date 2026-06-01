import { Injectable } from '@nestjs/common';
import { SimilarSearchResult, VectorPayload } from './vector-store.types';

interface QdrantSearchItem {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
}

@Injectable()
export class VectorStoreService {
  private readonly qdrantUrl: string;
  private readonly collectionName: string;

  constructor() {
    this.qdrantUrl = (process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/+$/, '');
    this.collectionName = process.env.QDRANT_COLLECTION || 'pharmacy_knowledge_base';
  }

  getCollectionName(): string {
    return this.collectionName;
  }

  async ensureCollection(vectorSize: number): Promise<void> {
    const check = await fetch(`${this.qdrantUrl}/collections/${this.collectionName}`);
    if (check.ok) {
      return;
    }

    const create = await fetch(`${this.qdrantUrl}/collections/${this.collectionName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      }),
    });

    if (!create.ok) {
      const err = await create.text();
      throw new Error(`Failed to create Qdrant collection: ${create.status} ${err}`);
    }
  }

  async upsertChunks(
    rows: Array<{
      id: string | number;
      embedding: number[];
      payload: VectorPayload;
    }>,
  ): Promise<void> {
    if (!rows.length) return;

    const points = rows.map((r) => ({
      id: r.id,
      vector: r.embedding,
      payload: r.payload,
    }));

    const response = await fetch(
      `${this.qdrantUrl}/collections/${this.collectionName}/points?wait=true`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to upsert points: ${response.status} ${err}`);
    }
  }

  async searchSimilar(queryEmbedding: number[], topK = 5): Promise<SimilarSearchResult[]> {
    const response = await fetch(
      `${this.qdrantUrl}/collections/${this.collectionName}/points/search`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vector: queryEmbedding,
          limit: topK,
          with_payload: true,
          with_vector: false,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to search points: ${response.status} ${err}`);
    }

    const data = (await response.json()) as { result: QdrantSearchItem[] };
    return (data.result || []).map((item) => {
      const payload = item.payload || {};
      return {
        id: String(item.id),
        score: item.score,
        source: String(payload.source || ''),
        title: String(payload.title || ''),
        content: String(payload.content || ''),
        category: String(payload.category || ''),
        chunkIndex: Number(payload.chunkIndex || 0),
      };
    });
  }
}
