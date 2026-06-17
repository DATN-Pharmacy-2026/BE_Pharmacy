import { Injectable } from '@nestjs/common';

interface OpenAIChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

@Injectable()
export class LlmService {
  private readonly maxAttempts = 3;

  private readonly provider = (
    process.env.LLM_PROVIDER ||
    process.env.AI_PROVIDER ||
    'openai'
  ).toLowerCase();

  private readonly openAiApiKey = process.env.OPENAI_API_KEY;
  private readonly openAiBaseUrl =
    process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  private readonly openAiModel =
    process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini';

  private readonly geminiApiKey = process.env.GEMINI_API_KEY;
  private readonly geminiBaseUrl =
    process.env.GEMINI_BASE_URL ||
    'https://generativelanguage.googleapis.com/v1beta';
  private readonly geminiModel =
    process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';

  async generateAnswer(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    if (this.provider === 'gemini') {
      return this.generateWithGemini(systemPrompt, userPrompt);
    }
    return this.generateWithOpenAi(systemPrompt, userPrompt);
  }

  private async generateWithOpenAi(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    if (!this.openAiApiKey) {
      throw new Error('OPENAI_API_KEY is missing.');
    }

    let lastError = '';
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const response = await fetch(
        `${this.openAiBaseUrl.replace(/\/+$/, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.openAiApiKey}`,
          },
          body: JSON.stringify({
            model: this.openAiModel,
            temperature: 0.2,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        },
      );

      if (response.ok) {
        const payload = (await response.json()) as OpenAIChatCompletionResponse;
        const answer = payload.choices?.[0]?.message?.content?.trim();
        if (!answer) {
          throw new Error('LLM API returned empty answer.');
        }
        return answer;
      }

      const err = await response.text();
      lastError = `LLM API failed (${response.status}): ${err}`;
      if (
        !this.isTransientStatus(response.status) ||
        attempt === this.maxAttempts
      ) {
        throw new Error(lastError);
      }
      await this.sleep(attempt * 500);
    }

    throw new Error(lastError || 'LLM API failed.');
  }

  private async generateWithGemini(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is missing.');
    }

    const model = this.normalizeGeminiModelForPath(this.geminiModel);
    const url = `${this.geminiBaseUrl.replace(/\/+$/, '')}/models/${model}:generateContent?key=${encodeURIComponent(this.geminiApiKey)}`;
    let lastError = '';
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      });

      if (response.ok) {
        const payload =
          (await response.json()) as GeminiGenerateContentResponse;
        const answer = payload.candidates?.[0]?.content?.parts
          ?.map((part) => part.text)
          .filter(Boolean)
          .join('\n')
          .trim();
        if (!answer) {
          throw new Error('Gemini API returned empty answer.');
        }
        return answer;
      }

      const err = await response.text();
      lastError = `Gemini API failed (${response.status}): ${err}`;
      if (
        !this.isTransientStatus(response.status) ||
        attempt === this.maxAttempts
      ) {
        throw new Error(lastError);
      }
      await this.sleep(attempt * 500);
    }

    throw new Error(lastError || 'Gemini API failed.');
  }

  private normalizeGeminiModelForPath(model: string): string {
    return model.replace(/^models\//, '');
  }

  private isTransientStatus(status: number): boolean {
    return (
      status === 408 ||
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
