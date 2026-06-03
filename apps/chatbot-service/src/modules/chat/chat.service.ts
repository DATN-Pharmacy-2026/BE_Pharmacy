import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from '../rag/embedding.service';
import { VectorStoreService } from '../rag/vector-store.service';
import { SafetyService } from '../safety/safety.service';
import { ConversationService } from '../conversation/conversation.service';
import { HandoffService } from '../handoff/handoff.service';
import { ChatResponseDto } from './dto/chat.dto';
import { LlmService } from './llm.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  private readonly systemPrompt = `Ban la chatbot ho tro khach hang cua he thong nha thuoc.

Quy tac:
- Chi tra loi dua tren CONTEXT duoc cung cap.
- Khong tu bia thong tin.
- Khong chan doan benh.
- Khong ke don thuoc.
- Khong tu van lieu dung chi tiet.
- Neu CONTEXT khong du, hay noi he thong chua co du du lieu.
- Cau tra loi can ngan gon, de hieu, lich su.`;

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
    private readonly llmService: LlmService,
    private readonly safetyService: SafetyService,
    private readonly conversationService: ConversationService,
    private readonly handoffService: HandoffService,
  ) {}

  async chat(
    userId: string,
    message: string,
    conversationId?: string,
    topK = 5,
  ): Promise<ChatResponseDto> {
    const convId = await this.conversationService.ensureConversation(userId, message, conversationId);
    await this.conversationService.appendMessage(convId, 'USER', message);

    const safety = this.safetyService.checkSafety(message);
    if (safety.handoffRequired) {
      const ticket = await this.handoffService.createTicket({
        conversationId: convId,
        userId,
        question: message,
        handoffReason: 'MEDICAL_SAFETY',
      });

      const response: ChatResponseDto = {
        answer:
          'Cau hoi cua ban can duoc duoc si kiem tra de dam bao an toan. He thong da ghi nhan yeu cau va chuyen toi nhan vien chuyen mon.',
        sources: [],
        handoffRequired: true,
        handoffReason: 'MEDICAL_SAFETY',
        handoffTicketId: ticket.id,
        handoffTicketCode: ticket.ticketCode,
        conversationId: convId,
      };

      await this.conversationService.appendMessage(convId, 'ASSISTANT', response.answer, {
        sources: response.sources,
        handoffRequired: true,
        handoffReason: response.handoffReason,
        handoffTicketId: response.handoffTicketId,
        handoffTicketCode: response.handoffTicketCode,
      });
      return response;
    }

    const queryEmbedding = await this.embeddingService.createEmbedding(message, 'RETRIEVAL_QUERY');
    const contexts = await this.vectorStoreService.searchSimilar(queryEmbedding, topK);

    if (!contexts.length || contexts[0].score < 0.35) {
      const ticket = await this.handoffService.createTicket({
        conversationId: convId,
        userId,
        question: message,
        handoffReason: 'INSUFFICIENT_CONTEXT',
      });

      const response: ChatResponseDto = {
        answer:
          'He thong chua co du du lieu lien quan de tra loi chinh xac. Ban vui long lien he duoc si de duoc ho tro them.',
        sources: [],
        handoffRequired: true,
        handoffReason: 'INSUFFICIENT_CONTEXT',
        handoffTicketId: ticket.id,
        handoffTicketCode: ticket.ticketCode,
        conversationId: convId,
      };

      await this.conversationService.appendMessage(convId, 'ASSISTANT', response.answer, {
        sources: response.sources,
        handoffRequired: true,
        handoffReason: response.handoffReason,
        handoffTicketId: response.handoffTicketId,
        handoffTicketCode: response.handoffTicketCode,
      });
      return response;
    }

    const contextText = contexts
      .map(
        (c, idx) =>
          `[${idx + 1}] title=${c.title}; category=${c.category}; source=${c.source}; content=${c.content}`,
      )
      .join('\n');

    const userPrompt = `QUESTION:\n${message}\n\nCONTEXT:\n${contextText}\n\nHay tra loi dua tren CONTEXT. Neu thieu thong tin thi noi ro khong du du lieu.`;

    const sources = contexts.slice(0, topK).map((c) => ({
      title: c.title,
      source: c.source,
    }));

    let answer: string;
    try {
      answer = await this.llmService.generateAnswer(this.systemPrompt, userPrompt);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      this.logger.warn(`LLM unavailable, returning fallback answer: ${messageText}`);
      answer = this.buildFallbackAnswer(contexts);
    }

    const response: ChatResponseDto = {
      answer,
      sources,
      handoffRequired: false,
      conversationId: convId,
    };

    await this.conversationService.appendMessage(convId, 'ASSISTANT', response.answer, {
      sources: response.sources,
      handoffRequired: false,
      handoffReason: null,
    });

    return response;
  }

  private buildFallbackAnswer(
    contexts: Array<{ title: string; category: string; source: string; content: string }>,
  ): string {
    const highlights = contexts
      .slice(0, 3)
      .map((contextItem, index) => {
        const content = contextItem.content.replace(/\s+/g, ' ').trim();
        const summary = content.length > 220 ? `${content.slice(0, 217)}...` : content;
        return `${index + 1}. ${contextItem.title}: ${summary}`;
      })
      .join('\n');

    return `Hien tai he thong AI dang qua tai tam thoi. Du lieu lien quan trong he thong:\n${highlights}\n\nNeu can tu van chuyen mon hoac thong tin chi tiet hon, ban vui long lien he duoc si.`;
  }
}
