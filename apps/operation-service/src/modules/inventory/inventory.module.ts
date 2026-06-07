import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PublicInventoryController } from './public-inventory.controller';

@Module({
  controllers: [InventoryController, PublicInventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
