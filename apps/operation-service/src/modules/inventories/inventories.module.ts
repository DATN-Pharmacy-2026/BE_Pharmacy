import { Module } from '@nestjs/common';
import { InventoriesController } from './inventories.controller';
import { InventoriesService } from './inventories.service';
import { TenantContextService } from './tenant-context.service';

@Module({
  controllers: [InventoriesController],
  providers: [InventoriesService, TenantContextService],
})
export class InventoriesModule {}
