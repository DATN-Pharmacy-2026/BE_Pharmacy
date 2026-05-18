import { Module } from '@nestjs/common';
import { PosPaymentsController } from './pos-payments.controller';
import { PosPaymentsService } from './pos-payments.service';

@Module({
  controllers: [PosPaymentsController],
  providers: [PosPaymentsService],
})
export class PosPaymentsModule {}
