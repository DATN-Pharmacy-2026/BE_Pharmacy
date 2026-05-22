import { Global, Module } from '@nestjs/common';
import { ReportingPrismaService } from './reporting-prisma.service';

@Global()
@Module({
  providers: [ReportingPrismaService],
  exports: [ReportingPrismaService],
})
export class ReportingPrismaModule {}
