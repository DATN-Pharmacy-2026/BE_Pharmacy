export interface ReportExportCompletedPayload {
  reportJobId: string;
  reportExportId: string;
  reportType: string;
  downloadUrl: string;
  requestedByUserId?: string | null;
  branchId?: string | null;
  warehouseId?: string | null;
  completedAt: string;
}

export interface ReportExportFailedPayload {
  reportJobId: string;
  reportType: string;
  errorMessage: string;
  requestedByUserId?: string | null;
  branchId?: string | null;
  warehouseId?: string | null;
  failedAt: string;
}

export interface SettingsChangedPayload {
  settingId?: string | null;
  settingKey: string;
  settingGroup?: string | null;
  actorUserId?: string | null;
  branchId?: string | null;
  warehouseId?: string | null;
  changedAt: string;
}
