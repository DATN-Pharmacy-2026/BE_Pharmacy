import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
  Permissions,
  PermissionsGuard,
} from '@app/auth';
import { Request } from 'express';
import { InternalChatRequestDto } from './dto/internal-chat-request.dto';
import { InternalChatOrchestratorService } from './internal-chat.orchestrator.service';

@ApiTags('chatbot-internal')
@ApiBearerAuth()
@Controller('api/chatbot/internal')
export class InternalChatController {
  constructor(
    private readonly internalChatOrchestratorService: InternalChatOrchestratorService,
  ) {}

  @Post('chat')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('chatbot.internal.read')
  async chat(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Req() req: Request,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: InternalChatRequestDto,
  ) {
    if (!user) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    return this.internalChatOrchestratorService.chat(user, dto, {
      authorization: req.header('authorization') ?? undefined,
      correlationId: req.header('x-correlation-id') ?? undefined,
      requestId: req.header('x-request-id') ?? undefined,
    });
  }
}
