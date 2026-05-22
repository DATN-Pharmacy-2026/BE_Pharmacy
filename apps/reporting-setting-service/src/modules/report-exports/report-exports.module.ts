import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationEventsModule } from '../notification-events/notification-events.module';
import { ExcelExportService } from './excel-export.service';
import { ReportExportsController } from './report-exports.controller';
import { ReportExportStorageService } from './report-export-storage.service';
import { ReportExportsService } from './report-exports.service';

@Module({
  imports: [AuditLogsModule, NotificationEventsModule],
  controllers: [ReportExportsController],
  providers: [
    ReportExportsService,
    ExcelExportService,
    ReportExportStorageService,
  ],
  exports: [ReportExportsService],
})
export class ReportExportsModule {}
