import { Global, Module } from '@nestjs/common';
import { OperationPrismaService } from './operation-prisma.service';

@Global()
@Module({
  providers: [OperationPrismaService],
  exports: [OperationPrismaService],
})
export class OperationPrismaModule {}
