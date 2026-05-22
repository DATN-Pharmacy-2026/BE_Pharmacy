import { Injectable } from '@nestjs/common';
import { NotificationEvent, NotificationDeliveryStatus } from '.prisma/client/reporting';
import {
  EMAIL_PROVIDER_CONSOLE,
  EMAIL_PROVIDER_SMTP,
} from './notification-delivery.constants';

@Injectable()
export class NotificationEmailService {
  async sendEmail(
    event: NotificationEvent,
    recipientEmail: string,
    content?: {
      subject?: string;
      message?: string;
      html?: string;
    },
  ): Promise<{
    status: NotificationDeliveryStatus;
    provider: string;
    errorMessage?: string;
    response?: unknown;
  }> {
    const emailEnabled =
      `${process.env.NOTIFICATION_EMAIL_ENABLED ?? 'false'}`.toLowerCase() ===
      'true';
    const provider = (process.env.NOTIFICATION_EMAIL_PROVIDER ?? 'console').toLowerCase();

    if (!emailEnabled) {
      return {
        status: NotificationDeliveryStatus.SKIPPED,
        provider,
        errorMessage: 'Email delivery disabled by configuration',
      };
    }

    if (provider === EMAIL_PROVIDER_CONSOLE) {
      console.info('[notification-email:console]', {
        to: recipientEmail,
        subject: content?.subject ?? event.title,
        message: content?.message ?? event.message,
      });
      return {
        status: NotificationDeliveryStatus.SENT,
        provider,
        response: { mode: 'console' },
      };
    }

    if (provider !== EMAIL_PROVIDER_SMTP) {
      return {
        status: NotificationDeliveryStatus.SKIPPED,
        provider,
        errorMessage: 'Unsupported email provider',
      };
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? '587');
    const secure = `${process.env.SMTP_SECURE ?? 'false'}`.toLowerCase() === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM ?? 'Pharmacy ERP <no-reply@pharmacy.local>';

    if (!host || !user || !pass) {
      return {
        status: NotificationDeliveryStatus.SKIPPED,
        provider,
        errorMessage: 'SMTP configuration is incomplete',
      };
    }

    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      const info = await transporter.sendMail({
        from,
        to: recipientEmail,
        subject: content?.subject ?? event.title,
        text: content?.message ?? event.message,
        html: content?.html || `<p>${content?.message ?? event.message}</p>`,
      });
      return {
        status: NotificationDeliveryStatus.DELIVERED,
        provider,
        response: {
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
        },
      };
    } catch {
      return {
        status: NotificationDeliveryStatus.FAILED,
        provider,
        errorMessage: 'SMTP delivery failed',
      };
    }
  }
}
