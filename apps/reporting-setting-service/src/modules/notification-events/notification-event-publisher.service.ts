import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationEventStatus,
  NotificationEventType,
  NotificationSeverity,
} from '.prisma/client/reporting';
import { NotificationDeliveryService } from '../notification-delivery/notification-delivery.service';
import { NotificationEventsService } from './notification-events.service';

@Injectable()
export class NotificationEventPublisherService {
  constructor(
    private readonly notificationEventsService: NotificationEventsService,
    @Inject(forwardRef(() => NotificationDeliveryService))
    private readonly notificationDeliveryService: NotificationDeliveryService,
  ) {}

  async publish(
    input: Parameters<NotificationEventsService['create']>[0],
    options?: {
      deliverImmediately?: boolean;
      channels?: NotificationChannel[];
      recipientEmail?: string;
      dryRun?: boolean;
      force?: boolean;
      strict?: boolean;
    },
  ) {
    let created = input as any;
    if (
      !options?.force &&
      input.sourceService &&
      input.sourceEntityType &&
      input.sourceEntityId
    ) {
      const existing =
        await this.notificationEventsService.findExistingBySource({
          type: input.type,
          sourceService: input.sourceService,
          sourceModule: input.sourceModule,
          sourceEntityType: input.sourceEntityType,
          sourceEntityId: input.sourceEntityId,
          recipientUserId: input.recipientUserId,
        });
      if (existing) {
        created = existing;
      } else {
        created = await this.notificationEventsService.create(input);
      }
    } else {
      created = await this.notificationEventsService.create(input);
    }

    if (options?.deliverImmediately) {
      const deliverPromise =
        this.notificationDeliveryService.deliverEventSafely(created.id, {
          channels: options.channels,
          recipientEmail: options.recipientEmail,
          dryRun: options.dryRun,
        });
      if (options.strict) {
        await deliverPromise;
      } else {
        await deliverPromise.catch(() => undefined);
      }
    }
    return created;
  }

  async publishReportExportCompleted(
    params: {
      reportJobId: string;
      reportExportId: string;
      downloadUrl: string;
      reportType: string;
      recipientUserId?: string | null;
      branchId?: string | null;
      warehouseId?: string | null;
    },
    options?: {
      deliverImmediately?: boolean;
      recipientEmail?: string;
      channels?: NotificationChannel[];
      dryRun?: boolean;
    },
  ) {
    return this.publish(
      {
        type: NotificationEventType.REPORT_EXPORT_COMPLETED,
        channel: NotificationChannel.IN_APP,
        severity: NotificationSeverity.SUCCESS,
        title: 'Report export completed',
        message: 'Your report export is ready for download.',
        recipientUserId: params.recipientUserId ?? undefined,
        branchId: params.branchId ?? undefined,
        warehouseId: params.warehouseId ?? undefined,
        sourceService: 'reporting-setting-service',
        sourceModule: 'report-exports',
        sourceEntityType: 'ReportExport',
        sourceEntityId: params.reportExportId,
        payload: {
          reportJobId: params.reportJobId,
          reportExportId: params.reportExportId,
          reportType: params.reportType,
          downloadUrl: params.downloadUrl,
          branchId: params.branchId,
          warehouseId: params.warehouseId,
          requestedByUserId: params.recipientUserId,
        },
        status: NotificationEventStatus.PENDING,
      },
      {
        deliverImmediately: options?.deliverImmediately ?? false,
        channels: options?.channels ?? [NotificationChannel.IN_APP],
        recipientEmail: options?.recipientEmail,
        dryRun: options?.dryRun,
      },
    );
  }

  async publishReportExportFailed(
    params: {
      reportJobId: string;
      reportType: string;
      recipientUserId?: string | null;
      branchId?: string | null;
      warehouseId?: string | null;
      errorMessage: string;
    },
    options?: {
      deliverImmediately?: boolean;
      recipientEmail?: string;
      channels?: NotificationChannel[];
      dryRun?: boolean;
    },
  ) {
    return this.publish(
      {
        type: NotificationEventType.REPORT_EXPORT_FAILED,
        channel: NotificationChannel.IN_APP,
        severity: NotificationSeverity.ERROR,
        title: 'Report export failed',
        message: params.errorMessage,
        recipientUserId: params.recipientUserId ?? undefined,
        branchId: params.branchId ?? undefined,
        warehouseId: params.warehouseId ?? undefined,
        sourceService: 'reporting-setting-service',
        sourceModule: 'report-exports',
        sourceEntityType: 'ReportJob',
        sourceEntityId: params.reportJobId,
        payload: {
          reportJobId: params.reportJobId,
          reportType: params.reportType,
          errorMessage: params.errorMessage,
        },
        status: NotificationEventStatus.PENDING,
      },
      {
        deliverImmediately: options?.deliverImmediately ?? false,
        channels: options?.channels ?? [NotificationChannel.IN_APP],
        recipientEmail: options?.recipientEmail,
        dryRun: options?.dryRun,
      },
    );
  }

  async publishAuditAlert(input: {
    title: string;
    message: string;
    recipientUserId?: string;
    payload?: unknown;
  }) {
    return this.publish({
      type: NotificationEventType.AUDIT,
      channel: NotificationChannel.IN_APP,
      severity: NotificationSeverity.WARNING,
      sourceService: 'reporting-setting-service',
      sourceModule: 'audit-logs',
      status: NotificationEventStatus.PENDING,
      ...input,
    });
  }

  async publishSettingsChanged(input: {
    title: string;
    message: string;
    actorUserId?: string;
    branchId?: string;
    payload?: unknown;
  }) {
    return this.publish({
      type: NotificationEventType.SETTINGS_CHANGED,
      channel: NotificationChannel.IN_APP,
      severity: NotificationSeverity.INFO,
      sourceService: 'reporting-setting-service',
      sourceModule: 'settings',
      status: NotificationEventStatus.PENDING,
      ...input,
    });
  }
}
