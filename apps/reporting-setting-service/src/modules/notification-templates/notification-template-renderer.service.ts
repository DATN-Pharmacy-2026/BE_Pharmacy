import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationEventType, Prisma } from '.prisma/client/reporting';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';
import { DEFAULT_NOTIFICATION_LOCALE } from './notification-template.constants';

@Injectable()
export class NotificationTemplateRendererService {
  constructor(private readonly prisma: ReportingPrismaService) {}

  async renderByTemplateCode(code: string, context: Record<string, unknown>) {
    const template = await this.prisma.notificationTemplate.findUnique({ where: { code } });
    if (!template || !template.enabled) throw new NotFoundException('notification template not found');
    return this.renderTemplate(template, context);
  }

  async renderByEventType(
    eventType: NotificationEventType,
    channel: NotificationChannel,
    locale: string | undefined,
    context: Record<string, unknown>,
  ) {
    const resolvedLocale = locale || DEFAULT_NOTIFICATION_LOCALE;
    const template = await this.findBestTemplate(eventType, channel, resolvedLocale);
    if (!template) {
      return {
        subject: this.interpolate('{{title}}', context),
        title: this.interpolate('{{title}}', context),
        message: this.interpolate('{{message}}', context),
        html: '',
        template: null,
      };
    }

    return this.renderTemplate(template, context);
  }

  buildContextFromNotificationEvent(notificationEvent: Record<string, unknown>, explicitContext?: Record<string, unknown>) {
    const payload = notificationEvent.payload && typeof notificationEvent.payload === 'object'
      ? (notificationEvent.payload as Record<string, unknown>)
      : {};

    return {
      ...notificationEvent,
      ...payload,
      ...explicitContext,
      payload,
      notification: notificationEvent,
    };
  }

  private async findBestTemplate(eventType: NotificationEventType, channel: NotificationChannel, locale: string) {
    return this.prisma.notificationTemplate.findFirst({
      where: {
        eventType,
        channel,
        enabled: true,
        OR: [{ locale, isDefault: true }, { locale: DEFAULT_NOTIFICATION_LOCALE, isDefault: true }],
      },
      orderBy: [{ locale: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private renderTemplate(template: {
    subject: string | null;
    titleTemplate: string;
    messageTemplate: string;
    htmlTemplate: string | null;
  }, context: Record<string, unknown>) {
    return {
      subject: this.interpolate(template.subject ?? '{{title}}', context),
      title: this.interpolate(template.titleTemplate, context),
      message: this.interpolate(template.messageTemplate, context),
      html: template.htmlTemplate ? this.interpolateHtml(template.htmlTemplate, context) : '',
      template,
    };
  }

  private interpolate(template: string, context: Record<string, unknown>) {
    return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key: string) => {
      const value = this.getValueByPath(context, key);
      return value === undefined || value === null ? '' : String(value);
    });
  }

  private interpolateHtml(template: string, context: Record<string, unknown>) {
    return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key: string) => {
      const value = this.getValueByPath(context, key);
      return this.escapeHtml(value === undefined || value === null ? '' : String(value));
    });
  }

  private getValueByPath(context: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, part) => {
      if (!acc || typeof acc !== 'object') return undefined;
      return (acc as Record<string, unknown>)[part];
    }, context);
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
