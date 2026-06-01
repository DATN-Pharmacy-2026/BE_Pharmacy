import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../../../../node_modules/.prisma/client/commerce';

export type HandoffStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

@Injectable()
export class HandoffService implements OnModuleInit {
  private readonly prisma = new PrismaClient();

  async onModuleInit(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS chatbot_handoff_ticket (
        id UUID PRIMARY KEY,
        ticket_code VARCHAR(30) NOT NULL UNIQUE,
        conversation_id UUID NULL REFERENCES chatbot_conversation(id) ON DELETE SET NULL,
        user_id UUID NULL,
        question TEXT NOT NULL,
        handoff_reason VARCHAR(100) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        response_note TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  }

  private isUuid(value?: string | null): boolean {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private safeUuid(value?: string | null): string | null {
    return this.isUuid(value) ? value! : null;
  }

  private createTicketCode(): string {
    const suffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    return `CBT-${suffix}`;
  }

  async createTicket(input: {
    conversationId?: string;
    userId?: string;
    question: string;
    handoffReason: string;
  }) {
    const id = randomUUID();
    const ticketCode = this.createTicketCode();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO chatbot_handoff_ticket
      (id, ticket_code, conversation_id, user_id, question, handoff_reason, status, created_at, updated_at)
      VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5, $6, 'PENDING', NOW(), NOW())`,
      id,
      ticketCode,
      this.safeUuid(input.conversationId),
      this.safeUuid(input.userId),
      input.question,
      input.handoffReason,
    );

    return {
      id,
      ticketCode,
      status: 'PENDING' as HandoffStatus,
    };
  }

  async getTickets(status?: HandoffStatus) {
    if (status) {
      return this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT id, ticket_code, conversation_id, user_id, question, handoff_reason, status, response_note, created_at, updated_at
         FROM chatbot_handoff_ticket
         WHERE status = $1
         ORDER BY created_at DESC`,
        status,
      );
    }

    return this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, ticket_code, conversation_id, user_id, question, handoff_reason, status, response_note, created_at, updated_at
       FROM chatbot_handoff_ticket
       ORDER BY created_at DESC`,
    );
  }

  async getTicketById(id: string) {
    if (!this.isUuid(id)) return null;
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, ticket_code, conversation_id, user_id, question, handoff_reason, status, response_note, created_at, updated_at
       FROM chatbot_handoff_ticket
       WHERE id = $1::uuid
       LIMIT 1`,
      id,
    );
    return rows[0] ?? null;
  }

  async updateTicket(
    id: string,
    status: HandoffStatus,
    responseNote?: string,
  ): Promise<Record<string, unknown> | null> {
    if (!this.isUuid(id)) return null;
    await this.prisma.$executeRawUnsafe(
      `UPDATE chatbot_handoff_ticket
       SET status = $2,
           response_note = $3,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      id,
      status,
      responseNote ?? null,
    );
    return this.getTicketById(id);
  }
}
