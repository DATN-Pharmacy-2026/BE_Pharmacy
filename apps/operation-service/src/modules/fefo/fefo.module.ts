import { Module } from '@nestjs/common';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { FefoController } from './fefo.controller';
import { FefoService } from './fefo.service';

@Module({
  imports: [WarehousesModule],
  controllers: [FefoController],
  providers: [FefoService],
  exports: [FefoService],
})
export class FefoModule {}
