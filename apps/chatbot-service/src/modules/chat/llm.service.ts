import { Injectable } from '@nestjs/common';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class LlmService {
  private readonly apiKey = process.env.OPENAI_API_KEY;
  private readonly baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  private readonly model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

  async generateAnswer(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is missing.');
    }

    const response = await fetch(`${this.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
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

    const payload = (await response.json()) as ChatCompletionResponse;
    const answer = payload.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      throw new Error('LLM API returned empty answer.');
    }
    return answer;
  }
}
