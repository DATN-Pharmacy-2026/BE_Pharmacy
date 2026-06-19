import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../../../../node_modules/.prisma/client/commerce';

export type HandoffStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

@Injectable()
export class HandoffService implements OnModuleInit {
  private readonly logger = new Logger(HandoffService.name);
  private readonly prisma = new PrismaClient();

  constructor(private readonly configService: ConfigService) {}

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
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE chatbot_handoff_ticket
      ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'PUBLIC_CHATBOT',
      ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS branch_id VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS latest_chatbot_reply TEXT NULL,
      ADD COLUMN IF NOT EXISTS conversation_snapshot JSONB NULL,
      ADD COLUMN IF NOT EXISTS assigned_user_id UUID NULL,
      ADD COLUMN IF NOT EXISTS assigned_by_user_id UUID NULL,
      ADD COLUMN IF NOT EXISTS assignment_source VARCHAR(40) NULL,
      ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS contact_status VARCHAR(40) NOT NULL DEFAULT 'WAITING';
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
    source?: string;
    conversationId?: string;
    userId?: string;
    question: string;
    handoffReason: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    branchId?: string;
    latestChatbotReply?: string;
    conversationSnapshot?: Array<Record<string, unknown>>;
  }) {
    const id = randomUUID();
    const ticketCode = this.createTicketCode();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO chatbot_handoff_ticket
      (id, ticket_code, source, conversation_id, user_id, question, handoff_reason, status,
       customer_name, customer_phone, customer_email, branch_id, latest_chatbot_reply, conversation_snapshot,
       created_at, updated_at)
      VALUES ($1::uuid, $2, $3, $4::uuid, $5::uuid, $6, $7, 'PENDING',
              $8, $9, $10, $11, $12, $13::jsonb, NOW(), NOW())`,
      id,
      ticketCode,
      (input.source ?? 'PUBLIC_CHATBOT').trim(),
      this.safeUuid(input.conversationId),
      this.safeUuid(input.userId),
      input.question,
      input.handoffReason,
      input.customerName?.trim() ?? null,
      input.customerPhone?.trim() ?? null,
      input.customerEmail?.trim() ?? null,
      input.branchId?.trim() ?? null,
      input.latestChatbotReply?.trim() ?? null,
      input.conversationSnapshot
        ? JSON.stringify(input.conversationSnapshot)
        : null,
    );

    return {
      id,
      ticketCode,
      status: 'PENDING' as HandoffStatus,
    };
  }

  async getTickets(status?: HandoffStatus, assignedUserId?: string) {
    const safeAssignedUserId = this.safeUuid(assignedUserId);

    if (status || safeAssignedUserId) {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (status) {
        params.push(status);
        conditions.push(`status = $${params.length}`);
      }

      if (safeAssignedUserId) {
        params.push(safeAssignedUserId);
        conditions.push(`assigned_user_id = $${params.length}::uuid`);
      }

      return this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT id, ticket_code, conversation_id, user_id, question, handoff_reason, status, response_note,
                source, customer_name, customer_phone, customer_email, branch_id, latest_chatbot_reply, conversation_snapshot,
                assigned_user_id, assigned_by_user_id, assignment_source, assigned_at, contact_status,
                created_at, updated_at
         FROM chatbot_handoff_ticket
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC`,
        ...params,
      );
    }

    return this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, ticket_code, conversation_id, user_id, question, handoff_reason, status, response_note,
              source, customer_name, customer_phone, customer_email, branch_id, latest_chatbot_reply, conversation_snapshot,
              assigned_user_id, assigned_by_user_id, assignment_source, assigned_at, contact_status,
              created_at, updated_at
       FROM chatbot_handoff_ticket
       ORDER BY created_at DESC`,
    );
  }

  async getTicketById(id: string) {
    if (!this.isUuid(id)) return null;
    const rows = await this.prisma.$queryRawUnsafe<
      Array<Record<string, unknown>>
    >(
      `SELECT id, ticket_code, conversation_id, user_id, question, handoff_reason, status, response_note,
              source, customer_name, customer_phone, customer_email, branch_id, latest_chatbot_reply, conversation_snapshot,
              assigned_user_id, assigned_by_user_id, assignment_source, assigned_at, contact_status,
              created_at, updated_at
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

  async assignTicket(input: {
    id: string;
    assignedUserId: string;
    assignedByUserId?: string;
    assignmentSource?: 'MANUAL' | 'ACTIVE_POS_SESSION';
    responseNote?: string;
  }): Promise<Record<string, unknown> | null> {
    if (!this.isUuid(input.id) || !this.isUuid(input.assignedUserId))
      return null;

    await this.prisma.$executeRawUnsafe(
      `UPDATE chatbot_handoff_ticket
       SET assigned_user_id = $2::uuid,
           assigned_by_user_id = $3::uuid,
           assignment_source = $4,
           assigned_at = NOW(),
           contact_status = 'ASSIGNED',
           status = CASE WHEN status = 'PENDING' THEN 'IN_PROGRESS' ELSE status END,
           response_note = COALESCE($5, response_note),
           updated_at = NOW()
       WHERE id = $1::uuid`,
      input.id,
      input.assignedUserId,
      this.safeUuid(input.assignedByUserId),
      input.assignmentSource ?? 'MANUAL',
      input.responseNote ?? null,
    );

    const updated = await this.getTicketById(input.id);
    if (updated) {
      void this.publishAssignmentNotification(updated, input).catch((error) => {
        const detail =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `publishAssignmentNotification failed for ticket=${input.id}: ${detail}`,
        );
      });
    }

    return updated;
  }

  private async publishAssignmentNotification(
    ticket: Record<string, unknown>,
    input: {
      assignedUserId: string;
      assignedByUserId?: string;
      assignmentSource?: 'MANUAL' | 'ACTIVE_POS_SESSION';
    },
  ) {
    const baseUrl = this.getReportingBaseUrl();
    const ticketId =
      typeof ticket.id === 'string' ? ticket.id : input.assignedUserId;
    const ticketCode =
      typeof ticket.ticket_code === 'string'
        ? ticket.ticket_code
        : typeof ticket.ticketCode === 'string'
          ? ticket.ticketCode
          : `TCK-${ticketId.slice(-6).toUpperCase()}`;
    const customerName =
      typeof ticket.customer_name === 'string'
        ? ticket.customer_name
        : typeof ticket.customerName === 'string'
          ? ticket.customerName
          : 'khach hang';
    const question =
      typeof ticket.question === 'string' ? ticket.question.trim() : '';
    const preview =
      question.length > 140 ? `${question.slice(0, 137)}...` : question;
    const assignmentLabel =
      input.assignmentSource === 'ACTIVE_POS_SESSION'
        ? 'ca POS dang mo'
        : 'admin';

    const shouldSend = await this.shouldSendInAppAssignmentNotification(
      baseUrl,
      input.assignedUserId,
    );
    if (!shouldSend) {
      return;
    }

    const response = await fetch(`${baseUrl}/api/notification-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'CUSTOM',
        channel: 'IN_APP',
        severity: 'INFO',
        title: `Ticket moi duoc giao: ${ticketCode}`,
        message: `Ban vua nhan mot ticket ho tro tu ${assignmentLabel} cho ${customerName}. ${preview || 'Mo ticket de xem chi tiet va lien he khach hang.'}`,
        recipientUserId: input.assignedUserId,
        actorUserId: input.assignedByUserId,
        branchId:
          typeof ticket.branch_id === 'string'
            ? ticket.branch_id
            : typeof ticket.branchId === 'string'
              ? ticket.branchId
              : undefined,
        sourceService: 'chatbot-service',
        sourceModule: 'handoff',
        sourceEntityType: 'ChatbotHandoffTicket',
        sourceEntityId: ticketId,
        payload: {
          kind: 'CHATBOT_HANDOFF_ASSIGNMENT',
          ticketId,
          ticketCode,
          question,
          handoffReason:
            typeof ticket.handoff_reason === 'string'
              ? ticket.handoff_reason
              : typeof ticket.handoffReason === 'string'
                ? ticket.handoffReason
                : null,
          assignmentSource: input.assignmentSource ?? 'MANUAL',
        },
        status: 'PENDING',
      }),
    });

    if (!response.ok) {
      throw new Error(`status=${response.status}`);
    }
  }

  private async shouldSendInAppAssignmentNotification(
    baseUrl: string,
    userId: string,
  ): Promise<boolean> {
    const response = await fetch(
      `${baseUrl}/api/notification-preferences/resolve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          eventType: 'CUSTOM',
          channel: 'IN_APP',
          severity: 'INFO',
          checkQuietHours: true,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`resolve-status=${response.status}`);
    }

    const result = (await response.json()) as { enabled?: boolean };
    return result.enabled !== false;
  }

  private getReportingBaseUrl(): string {
    return (
      process.env.REPORTING_SERVICE_URL?.trim() ||
      process.env.REPORTING_SETTING_SERVICE_URL?.trim() ||
      this.configService.get<string>('gateway.services.reportingSetting') ||
      'http://localhost:3004'
    ).replace(/\/+$/, '');
  }
}
