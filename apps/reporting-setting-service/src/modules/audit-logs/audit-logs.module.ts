import { Module } from '@nestjs/common';
import { AuditLogWriterService } from './audit-log-writer.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLogWriterService],
  exports: [AuditLogsService, AuditLogWriterService],
})
export class AuditLogsModule {}
