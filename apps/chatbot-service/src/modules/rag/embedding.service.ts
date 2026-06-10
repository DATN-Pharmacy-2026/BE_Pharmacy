import { Injectable } from '@nestjs/common';

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
}

interface GeminiEmbeddingResponse {
  embedding?: {
    values?: number[];
  };
}

export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

@Injectable()
export class EmbeddingService {
  private readonly provider: string;
  private readonly openAiApiKey: string | undefined;
  private readonly openAiModel: string;
  private readonly openAiBaseUrl: string;
  private readonly geminiApiKey: string | undefined;
  private readonly geminiModel: string;
  private readonly geminiBaseUrl: string;

  constructor() {
    this.provider = (
      process.env.EMBEDDING_PROVIDER ||
      process.env.AI_PROVIDER ||
      'openai'
    ).toLowerCase();
    this.openAiApiKey = process.env.OPENAI_API_KEY;
    this.openAiModel =
      process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    this.openAiBaseUrl =
      process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiModel =
      process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
    this.geminiBaseUrl =
      process.env.GEMINI_BASE_URL ||
      'https://generativelanguage.googleapis.com/v1beta';
  }

  hasApiKey(): boolean {
    if (this.provider === 'gemini') {
      return Boolean(this.geminiApiKey && this.geminiApiKey.trim());
    }
    return Boolean(this.openAiApiKey && this.openAiApiKey.trim());
  }

  getProviderName(): string {
    return this.provider;
  }

  async createEmbedding(
    text: string,
    taskType: EmbeddingTaskType = 'RETRIEVAL_DOCUMENT',
  ): Promise<number[]> {
    if (this.provider === 'gemini') {
      return this.createGeminiEmbedding(text, taskType);
    }
    return this.createOpenAiEmbedding(text);
  }

  private async createOpenAiEmbedding(text: string): Promise<number[]> {
    if (!this.hasApiKey()) {
      throw new Error(
        'OPENAI_API_KEY is missing. Set it before running embedding ingest.',
      );
    }

    const response = await fetch(
      `${this.openAiBaseUrl.replace(/\/+$/, '')}/embeddings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openAiApiKey}`,
        },
        body: JSON.stringify({
          model: this.openAiModel,
          input: text,
        }),
      },
    );

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

  private async createGeminiEmbedding(
    text: string,
    taskType: EmbeddingTaskType,
  ): Promise<number[]> {
    if (!this.hasApiKey()) {
      throw new Error(
        'GEMINI_API_KEY is missing. Set it before running embedding ingest.',
      );
    }

    const modelForPath = this.normalizeGeminiModelForPath(this.geminiModel);
    const modelForBody = `models/${modelForPath}`;
    const url = `${this.geminiBaseUrl.replace(/\/+$/, '')}/models/${modelForPath}:embedContent?key=${encodeURIComponent(this.geminiApiKey!)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelForBody,
        content: {
          parts: [{ text }],
        },
        taskType,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Gemini embedding API failed (${response.status}): ${errText}`,
      );
    }

    const payload = (await response.json()) as GeminiEmbeddingResponse;
    const vector = payload.embedding?.values;
    if (!vector || !Array.isArray(vector) || vector.length === 0) {
      throw new Error('Gemini embedding API returned empty vector.');
    }

    return vector;
  }

  private normalizeGeminiModelForPath(model: string): string {
    return model.replace(/^models\//, '');
  }
}
