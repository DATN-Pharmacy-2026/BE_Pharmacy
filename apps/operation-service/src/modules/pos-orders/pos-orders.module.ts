import { Module } from '@nestjs/common';
import { PosOrdersController } from './pos-orders.controller';
import { PosOrdersService } from './pos-orders.service';

@Module({
  controllers: [PosOrdersController],
  providers: [PosOrdersService],
})
export class PosOrdersModule {}
