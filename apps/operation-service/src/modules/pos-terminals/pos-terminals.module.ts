import { Module } from '@nestjs/common';
import { BranchesModule } from '../branches/branches.module';
import { StoresModule } from '../stores/stores.module';
import { PosTerminalsController } from './pos-terminals.controller';
import { PosTerminalsService } from './pos-terminals.service';

@Module({
  imports: [BranchesModule, StoresModule],
  controllers: [PosTerminalsController],
  providers: [PosTerminalsService],
})
export class PosTerminalsModule {}
