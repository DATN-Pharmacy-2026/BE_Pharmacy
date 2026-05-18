import { Module } from '@nestjs/common';
import { BranchesModule } from '../branches/branches.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { StockAdjustmentsController } from './stock-adjustments.controller';
import { StockAdjustmentsService } from './stock-adjustments.service';

@Module({
  imports: [WarehousesModule, BranchesModule],
  controllers: [StockAdjustmentsController],
  providers: [StockAdjustmentsService],
})
export class StockAdjustmentsModule {}
