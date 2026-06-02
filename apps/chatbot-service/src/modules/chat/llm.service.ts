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
  private readonly provider = (
    process.env.LLM_PROVIDER ||
    process.env.AI_PROVIDER ||
    'openai'
  ).toLowerCase();

  private readonly openAiApiKey = process.env.OPENAI_API_KEY;
  private readonly openAiBaseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  private readonly openAiModel = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

  private readonly geminiApiKey = process.env.GEMINI_API_KEY;
  private readonly geminiBaseUrl =
    process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
  private readonly geminiModel = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';

  async generateAnswer(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.provider === 'gemini') {
      return this.generateWithGemini(systemPrompt, userPrompt);
    }
    return this.generateWithOpenAi(systemPrompt, userPrompt);
  }

  private async generateWithOpenAi(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.openAiApiKey) {
      throw new Error('OPENAI_API_KEY is missing.');
    }

    const response = await fetch(`${this.openAiBaseUrl.replace(/\/+$/, '')}/chat/completions`, {
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
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LLM API failed (${response.status}): ${err}`);
    }

    const payload = (await response.json()) as OpenAIChatCompletionResponse;
    const answer = payload.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      throw new Error('LLM API returned empty answer.');
    }
    return answer;
  }

  private async generateWithGemini(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is missing.');
    }

    const model = this.normalizeGeminiModelForPath(this.geminiModel);
    const url = `${this.geminiBaseUrl.replace(/\/+$/, '')}/models/${model}:generateContent?key=${encodeURIComponent(this.geminiApiKey)}`;
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

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API failed (${response.status}): ${err}`);
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse;
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

  private normalizeGeminiModelForPath(model: string): string {
    return model.replace(/^models\//, '');
  }
}
