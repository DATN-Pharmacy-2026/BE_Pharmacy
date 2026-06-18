import { Module } from '@nestjs/common';
import { HandoffController } from './handoff.controller';
import { HandoffService } from './handoff.service';
import { PublicHandoffController } from './public-handoff.controller';

@Module({
  controllers: [HandoffController, PublicHandoffController],
  providers: [HandoffService],
  exports: [HandoffService],
})
export class HandoffModule {}
