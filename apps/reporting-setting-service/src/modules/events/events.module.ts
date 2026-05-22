import { Module } from '@nestjs/common';
import { EventBusModule } from '@app/event-bus';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [EventBusModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
