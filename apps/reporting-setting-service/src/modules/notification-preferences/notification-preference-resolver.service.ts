import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationEventType, NotificationSeverity } from '.prisma/client/reporting';
import { ReportingPrismaService } from '../../prisma/reporting-prisma.service';
import { ResolveNotificationPreferenceDto } from './dto/resolve-notification-preference.dto';

const SEVERITY_ORDER: Record<NotificationSeverity, number> = {
  INFO: 1,
  SUCCESS: 2,
  WARNING: 3,
  ERROR: 4,
  CRITICAL: 5,
};

export type PreferenceResolveReason =
  | 'EXPLICIT_USER_MATCH'
  | 'BRANCH_MATCH'
  | 'WAREHOUSE_MATCH'
  | 'GLOBAL_DEFAULT'
  | 'NO_MATCH_DEFAULT_ALLOW'
  | 'SEVERITY_BLOCKED'
  | 'QUIET_HOURS_BLOCKED';

@Injectable()
export class NotificationPreferenceResolverService {
  constructor(private readonly prisma: ReportingPrismaService) {}

  async resolve(input: ResolveNotificationPreferenceDto): Promise<{
    enabled: boolean;
    matchedPreference: unknown | null;
    reason: PreferenceResolveReason;
  }> {
    const matchedPreference = await this.findMatchedPreference(input);
    if (!matchedPreference) {
      return { enabled: true, matchedPreference: null, reason: 'NO_MATCH_DEFAULT_ALLOW' };
    }

    if (!matchedPreference.enabled) {
      return { enabled: false, matchedPreference, reason: this.classifyMatchReason(matchedPreference, input) };
    }

    if (input.severity && matchedPreference.severityThreshold) {
      if (SEVERITY_ORDER[input.severity] < SEVERITY_ORDER[matchedPreference.severityThreshold]) {
        return { enabled: false, matchedPreference, reason: 'SEVERITY_BLOCKED' };
      }
    }

    const checkQuietHours = input.checkQuietHours ?? true;
    if (checkQuietHours && input.severity !== NotificationSeverity.CRITICAL && this.isInQuietHours(matchedPreference)) {
      return { enabled: false, matchedPreference, reason: 'QUIET_HOURS_BLOCKED' };
    }

    return {
      enabled: true,
      matchedPreference,
      reason: this.classifyMatchReason(matchedPreference, input),
    };
  }

  async isChannelEnabledForEvent(notificationEvent: {
    recipientUserId?: string | null;
    branchId?: string | null;
    warehouseId?: string | null;
    type: NotificationEventType;
    severity: NotificationSeverity;
  }, channel: NotificationChannel) {
    return this.resolve({
      userId: notificationEvent.recipientUserId ?? undefined,
      branchId: notificationEvent.branchId ?? undefined,
      warehouseId: notificationEvent.warehouseId ?? undefined,
      eventType: notificationEvent.type,
      channel,
      severity: notificationEvent.severity,
      checkQuietHours: true,
    });
  }

  async filterEnabledChannels(
    notificationEvent: {
      recipientUserId?: string | null;
      branchId?: string | null;
      warehouseId?: string | null;
      type: NotificationEventType;
      severity: NotificationSeverity;
    },
    candidateChannels: NotificationChannel[],
  ) {
    const results = await Promise.all(
      candidateChannels.map(async (channel) => ({
        channel,
        result: await this.isChannelEnabledForEvent(notificationEvent, channel),
      })),
    );

    return {
      enabledChannels: results.filter((r) => r.result.enabled).map((r) => r.channel),
      details: results,
    };
  }

  private async findMatchedPreference(input: ResolveNotificationPreferenceDto) {
    const scopes: Array<{ userId?: string; branchId?: string; warehouseId?: string }> = [
      { userId: input.userId, branchId: input.branchId, warehouseId: input.warehouseId },
      { userId: input.userId, branchId: input.branchId },
      { userId: input.userId, warehouseId: input.warehouseId },
      { userId: input.userId },
      { branchId: input.branchId },
      { warehouseId: input.warehouseId },
      {},
    ];

    for (const scope of scopes) {
      const found = await this.prisma.notificationPreference.findFirst({
        where: {
          eventType: input.eventType,
          channel: input.channel,
          userId: scope.userId ?? null,
          branchId: scope.branchId ?? null,
          warehouseId: scope.warehouseId ?? null,
        },
      });
      if (found) return found;
    }

    return null;
  }

  private classifyMatchReason(
    pref: { userId: string | null; branchId: string | null; warehouseId: string | null },
    input: ResolveNotificationPreferenceDto,
  ): PreferenceResolveReason {
    if (pref.userId && pref.userId === input.userId) return 'EXPLICIT_USER_MATCH';
    if (pref.branchId && pref.branchId === input.branchId) return 'BRANCH_MATCH';
    if (pref.warehouseId && pref.warehouseId === input.warehouseId) return 'WAREHOUSE_MATCH';
    return 'GLOBAL_DEFAULT';
  }

  private isInQuietHours(pref: { quietHoursStart: string | null; quietHoursEnd: string | null; timezone: string | null }) {
    if (!pref.quietHoursStart || !pref.quietHoursEnd) return false;

    const [startH, startM] = pref.quietHoursStart.split(':').map(Number);
    const [endH, endM] = pref.quietHoursEnd.split(':').map(Number);
    if ([startH, startM, endH, endM].some((v) => Number.isNaN(v))) return false;

    const now = new Date();
    const localNow = pref.timezone
      ? new Date(now.toLocaleString('en-US', { timeZone: pref.timezone }))
      : now;

    const nowMinutes = localNow.getHours() * 60 + localNow.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes === endMinutes) return false;
    if (startMinutes < endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    }
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  }
}
