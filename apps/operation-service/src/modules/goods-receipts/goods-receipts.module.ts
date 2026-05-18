import { Module } from '@nestjs/common';
import { BatchesModule } from '../batches/batches.module';
import { BranchesModule } from '../branches/branches.module';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';

@Module({
  imports: [SuppliersModule, WarehousesModule, BranchesModule, PurchaseOrdersModule, BatchesModule],
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService],
})
export class GoodsReceiptsModule {}
