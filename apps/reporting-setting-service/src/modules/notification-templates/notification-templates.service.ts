import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationChannel,
  NotificationEventType,
  Prisma,
} from '.prisma/client/reporting';
import { AuditLogWriterService } from '../audit-logs/audit-log-writer.service';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { QueryNotificationTemplatesDto } from './dto/query-notification-templates.dto';
import { RenderNotificationTemplateDto } from './dto/render-notification-template.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { DEFAULT_NOTIFICATION_LOCALE } from './notification-template.constants';
import { NotificationTemplateRendererService } from './notification-template-renderer.service';

@Injectable()
export class NotificationTemplatesService {
  constructor(
    private readonly prisma: ReportingPrismaService,
    private readonly renderer: NotificationTemplateRendererService,
    private readonly auditLogWriterService: AuditLogWriterService,
  ) {}

  async findAll(query: QueryNotificationTemplatesDto) {
    const {
      page = 1,
      limit = 20,
      code,
      eventType,
      channel,
      locale,
      enabled,
      isDefault,
    } = query;
    const where: Prisma.NotificationTemplateWhereInput = {
      ...(code ? { code: { contains: code, mode: 'insensitive' } } : {}),
      ...(eventType ? { eventType } : {}),
      ...(channel ? { channel } : {}),
      ...(locale ? { locale } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
      ...(isDefault !== undefined ? { isDefault } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notificationTemplate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationTemplate.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const found = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
    if (!found) throw new NotFoundException('notification template not found');
    return found;
  }

  async create(dto: CreateNotificationTemplateDto) {
    try {
      if (dto.isDefault) {
        await this.clearDefaultForScope(
          dto.eventType,
          dto.channel,
          dto.locale ?? DEFAULT_NOTIFICATION_LOCALE,
        );
      }

      const created = await this.prisma.notificationTemplate.create({
        data: {
          ...dto,
          locale: dto.locale ?? DEFAULT_NOTIFICATION_LOCALE,
          variables:
            dto.variables === undefined
              ? undefined
              : (dto.variables as Prisma.InputJsonValue),
          enabled: dto.enabled ?? true,
          isDefault: dto.isDefault ?? false,
        },
      });

      void this.auditLogWriterService.write({
        serviceName: 'reporting-setting-service',
        module: 'notification-templates',
        action: 'create',
        entityType: 'NotificationTemplate',
        entityId: created.id,
        afterData: created,
      });

      return created;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('duplicate template code');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateNotificationTemplateDto) {
    const existing = await this.findOne(id);

    if (dto.isDefault === true) {
      await this.clearDefaultForScope(
        existing.eventType,
        existing.channel,
        existing.locale,
        id,
      );
    }

    const updated = await this.prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...dto,
        variables:
          dto.variables === undefined
            ? undefined
            : (dto.variables as Prisma.InputJsonValue),
      },
    });

    void this.auditLogWriterService.write({
      serviceName: 'reporting-setting-service',
      module: 'notification-templates',
      action: 'update',
      entityType: 'NotificationTemplate',
      entityId: updated.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.prisma.notificationTemplate.delete({ where: { id } });

    void this.auditLogWriterService.write({
      serviceName: 'reporting-setting-service',
      module: 'notification-templates',
      action: 'delete',
      entityType: 'NotificationTemplate',
      entityId: existing.id,
      beforeData: existing,
    });

    return { deleted: true };
  }

  async render(dto: RenderNotificationTemplateDto) {
    if (dto.templateCode) {
      return this.renderer.renderByTemplateCode(dto.templateCode, dto.context);
    }
    return this.renderer.renderByEventType(
      dto.eventType,
      dto.channel,
      dto.locale,
      dto.context,
    );
  }

  async seedDefaults() {
    const defaults = this.buildDefaultTemplates();
    let created = 0;
    let updated = 0;

    for (const item of defaults) {
      const existing = await this.prisma.notificationTemplate.findUnique({
        where: { code: item.code },
      });
      if (existing) {
        await this.prisma.notificationTemplate.update({
          where: { id: existing.id },
          data: {
            ...item,
            variables: item.variables as Prisma.InputJsonValue,
          },
        });
        updated += 1;
      } else {
        await this.prisma.notificationTemplate.create({
          data: {
            ...item,
            variables: item.variables as Prisma.InputJsonValue,
          },
        });
        created += 1;
      }
    }

    void this.auditLogWriterService.write({
      serviceName: 'reporting-setting-service',
      module: 'notification-templates',
      action: 'seed-defaults',
      entityType: 'NotificationTemplate',
      afterData: { created, updated, total: defaults.length },
    });

    return { created, updated, total: defaults.length };
  }

  private async clearDefaultForScope(
    eventType: NotificationEventType,
    channel: NotificationChannel,
    locale: string,
    excludeId?: string,
  ) {
    await this.prisma.notificationTemplate.updateMany({
      where: {
        eventType,
        channel,
        locale,
        isDefault: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      data: { isDefault: false },
    });
  }

  private buildDefaultTemplates() {
    const locale = DEFAULT_NOTIFICATION_LOCALE;
    const byChannels = [
      NotificationChannel.IN_APP,
      NotificationChannel.WEBSOCKET,
      NotificationChannel.EMAIL,
    ];

    const rows: Array<{
      code: string;
      eventType: NotificationEventType;
      channel: NotificationChannel;
      locale: string;
      subject: string | null;
      titleTemplate: string;
      messageTemplate: string;
      htmlTemplate: string | null;
      variables: Record<string, unknown>;
      enabled: boolean;
      isDefault: boolean;
    }> = [];

    for (const channel of byChannels) {
      rows.push({
        code: `report_export_completed.${channel.toLowerCase()}.vi`,
        eventType: NotificationEventType.REPORT_EXPORT_COMPLETED,
        channel,
        locale,
        subject: 'Báo cáo đã sẵn sàng',
        titleTemplate: 'Báo cáo đã xuất xong',
        messageTemplate:
          'Báo cáo {{reportType}} đã được xuất thành công. Bạn có thể tải tại {{downloadUrl}}.',
        htmlTemplate:
          '<p>Báo cáo <strong>{{reportType}}</strong> đã được xuất thành công. Tải: {{downloadUrl}}</p>',
        variables: { reportType: '', downloadUrl: '' },
        enabled: true,
        isDefault: true,
      });

      rows.push({
        code: `report_export_failed.${channel.toLowerCase()}.vi`,
        eventType: NotificationEventType.REPORT_EXPORT_FAILED,
        channel,
        locale,
        subject: 'Xuất báo cáo thất bại',
        titleTemplate: 'Xuất báo cáo thất bại',
        messageTemplate:
          'Báo cáo {{reportType}} xuất thất bại. Lý do: {{errorMessage}}.',
        htmlTemplate:
          '<p>Báo cáo <strong>{{reportType}}</strong> thất bại. Lý do: {{errorMessage}}</p>',
        variables: { reportType: '', errorMessage: '' },
        enabled: true,
        isDefault: true,
      });
    }

    rows.push(
      {
        code: 'low_stock.in_app.vi',
        eventType: NotificationEventType.LOW_STOCK,
        channel: NotificationChannel.IN_APP,
        locale,
        subject: 'Canh bao ton kho thap',
        titleTemplate: 'Tồn kho thấp',
        messageTemplate:
          'Sản phẩm {{productName}} tại chi nhánh/kho {{branchId}}{{warehouseId}} đang dưới ngưỡng tồn kho.',
        htmlTemplate: null,
        variables: { productName: '', branchId: '', warehouseId: '' },
        enabled: true,
        isDefault: true,
      },
      {
        code: 'expiring_batch.in_app.vi',
        eventType: NotificationEventType.EXPIRING_BATCH,
        channel: NotificationChannel.IN_APP,
        locale,
        subject: 'Canh bao lo sap het han',
        titleTemplate: 'Lo hang sap het han',
        messageTemplate:
          'Lo {{batchCode}} cua san pham {{productName}} se het han vao {{expiryDate}}.',
        htmlTemplate: null,
        variables: { batchCode: '', productName: '', expiryDate: '' },
        enabled: true,
        isDefault: true,
      },
      {
        code: 'settings_changed.in_app.vi',
        eventType: NotificationEventType.SETTINGS_CHANGED,
        channel: NotificationChannel.IN_APP,
        locale,
        subject: 'Cấu hình hệ thống đã thay đổi',
        titleTemplate: 'Cấu hình đã thay đổi',
        messageTemplate: 'Cấu hình {{settingKey}} đã được cập nhật.',
        htmlTemplate: null,
        variables: { settingKey: '' },
        enabled: true,
        isDefault: true,
      },
      {
        code: 'audit.in_app.vi',
        eventType: NotificationEventType.AUDIT,
        channel: NotificationChannel.IN_APP,
        locale,
        subject: 'Canh bao hoat dong he thong',
        titleTemplate: 'Hoat dong can chu y',
        messageTemplate:
          '{{actorUserId}} đã thực hiện {{action}} trên {{entityType}}.',
        htmlTemplate: null,
        variables: { actorUserId: '', action: '', entityType: '' },
        enabled: true,
        isDefault: true,
      },
      {
        code: 'custom.in_app.vi',
        eventType: NotificationEventType.CUSTOM,
        channel: NotificationChannel.IN_APP,
        locale,
        subject: '{{title}}',
        titleTemplate: '{{title}}',
        messageTemplate: '{{message}}',
        htmlTemplate: null,
        variables: { title: '', message: '' },
        enabled: true,
        isDefault: true,
      },
    );

    return rows;
  }
}
