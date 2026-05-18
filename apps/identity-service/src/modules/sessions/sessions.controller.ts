import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/auth';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('users/:userId')
  list(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.sessionsService.listUserSessions(userId);
  }

  @Delete(':id')
  revoke(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.sessionsService.revokeSession(id);
  }
}
