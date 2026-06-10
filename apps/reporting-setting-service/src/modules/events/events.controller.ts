import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventFailureType } from '@app/event-bus';
import { EventsService } from './events.service';

@ApiTags('reporting-events')
@Controller('api/reporting-events')
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Get('health')
  health() {
    return this.service.health();
  }

  @Get('outbox')
  outbox(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.listOutbox(Number(page ?? 1), Number(limit ?? 20));
  }

  @Get('inbox')
  inbox(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.listInbox(Number(page ?? 1), Number(limit ?? 20));
  }

  @Get('failures')
  failures(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.listFailures(Number(page ?? 1), Number(limit ?? 20));
  }

  @Get('failures/summary')
  failuresSummary() {
    return this.service.failuresSummary();
  }

  @Get('failures/:id')
  failureDetail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.failureDetail(id);
  }

  @Get('failures/:id/payload-preview')
  payloadPreview(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.payloadPreview(id);
  }

  @Post('failures/:id/replay')
  replay(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body()
    body: {
      mode:
        | 'REPLAY_ORIGINAL'
        | 'REPLAY_AS_NEW_EVENT'
        | 'MARK_RESOLVED'
        | 'IGNORE';
      reason: string;
      dryRun?: boolean;
    },
  ) {
    return this.service.replayFailure(id, body);
  }

  @Post('failures/:id/resolve')
  resolve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.resolveFailure(id, body.reason);
  }

  @Post('failures/:id/ignore')
  ignore(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.ignoreFailure(id, body.reason);
  }

  @Get('replay-audits')
  replayAudits(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.listReplayAudits(
      Number(page ?? 1),
      Number(limit ?? 20),
    );
  }

  @Get('retry-policy')
  retryPolicy() {
    return this.service.getRetryPolicy();
  }

  @Post('retry-policy/evaluate')
  retryPolicyEvaluate(
    @Body()
    body: {
      eventType: string;
      failureType: EventFailureType;
      attempt: number;
    },
  ) {
    return this.service.evaluateRetryPolicy(body);
  }

  @Post('outbox/:id/publish')
  publish(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.publishOutbox(id);
  }

  @Post('publish-test')
  publishTest(
    @Body()
    body: {
      eventType: string;
      aggregateId: string;
      payload: Record<string, unknown>;
    },
  ) {
    return this.service.publishTest(body);
  }
}
