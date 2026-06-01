import { Injectable } from '@nestjs/common';

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
}

@Injectable()
export class EmbeddingService {
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  hasApiKey(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim());
  }

  async createEmbedding(text: string): Promise<number[]> {
    if (!this.hasApiKey()) {
      throw new Error('OPENAI_API_KEY is missing. Set it before running embedding ingest.');
    }

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Embedding API failed (${response.status}): ${errText}`);
    }

    const payload = (await response.json()) as OpenAIEmbeddingResponse;
    const vector = payload?.data?.[0]?.embedding;
    if (!vector || !Array.isArray(vector) || vector.length === 0) {
      throw new Error('Embedding API returned empty vector.');
    }

    return vector;
  }
}
