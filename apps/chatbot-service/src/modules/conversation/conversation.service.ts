import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../../../../node_modules/.prisma/client/commerce';

type Sender = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'PHARMACIST';

@Injectable()
export class ConversationService implements OnModuleInit {
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS chatbot_conversation (
        id UUID PRIMARY KEY,
        user_id UUID NULL,
        title VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NULL
      );
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS chatbot_message (
        id UUID PRIMARY KEY,
        conversation_id UUID NOT NULL REFERENCES chatbot_conversation(id) ON DELETE CASCADE,
        sender VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  }

  private isUuid(value?: string | null): boolean {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private safeUserId(userId?: string | null): string | null {
    return this.isUuid(userId) ? userId! : null;
  }

  async ensureConversation(
    userId: string,
    message: string,
    conversationId?: string,
  ): Promise<string> {
    const safeId = this.safeUserId(userId);
    if (this.isUuid(conversationId)) {
      const existing = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM chatbot_conversation WHERE id = $1::uuid LIMIT 1`,
        conversationId,
      );
      if (existing.length > 0) {
        return conversationId!;
      }
    }

    const id = randomUUID();
    const title = message.trim().slice(0, 120);
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO chatbot_conversation (id, user_id, title, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, NOW(), NOW())`,
      id,
      safeId,
      title,
    );
    return id;
  }

  async appendMessage(
    conversationId: string,
    sender: Sender,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const id = randomUUID();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO chatbot_message (id, conversation_id, sender, content, metadata, created_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::jsonb, NOW())`,
      id,
      conversationId,
      sender,
      content,
      metadata ? JSON.stringify(metadata) : null,
    );
    await this.prisma.$executeRawUnsafe(
      `UPDATE chatbot_conversation SET updated_at = NOW() WHERE id = $1::uuid`,
      conversationId,
    );
  }

  async getConversationsByUser(userId: string) {
    const safeId = this.safeUserId(userId);
    if (!safeId) return [];
    return this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, user_id, title, created_at, updated_at
       FROM chatbot_conversation
       WHERE user_id = $1::uuid
       ORDER BY COALESCE(updated_at, created_at) DESC`,
      safeId,
    );
  }

  async getConversationDetail(conversationId: string) {
    if (!this.isUuid(conversationId)) {
      return { conversation: null, messages: [] };
    }
    const conversations = await this.prisma.$queryRawUnsafe<
      Array<Record<string, unknown>>
    >(
      `SELECT id, user_id, title, created_at, updated_at
       FROM chatbot_conversation
       WHERE id = $1::uuid
       LIMIT 1`,
      conversationId,
    );
    const messages = await this.prisma.$queryRawUnsafe<
      Array<Record<string, unknown>>
    >(
      `SELECT id, conversation_id, sender, content, metadata, created_at
       FROM chatbot_message
       WHERE conversation_id = $1::uuid
       ORDER BY created_at ASC`,
      conversationId,
    );
    return { conversation: conversations[0] ?? null, messages };
  }
}
