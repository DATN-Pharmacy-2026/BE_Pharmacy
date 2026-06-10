import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Request } from 'express';
import { ClosePosSessionDto } from './dto/close-pos-session.dto';
import { OpenPosSessionDto } from './dto/open-pos-session.dto';
import { QueryPosSessionsDto } from './dto/query-pos-sessions.dto';
import { PosSessionsService } from './pos-sessions.service';

@ApiTags('pos-sessions')
@ApiBearerAuth()
@ApiHeader({ name: 'x-branch-id', required: false })
@UseGuards(JwtAuthGuard)
@Controller('api/pos-sessions')
export class PosSessionsController {
  constructor(private readonly posSessionsService: PosSessionsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('pos.access', 'pos.shift.view')
  findAll(@Query() query: QueryPosSessionsDto) {
    return this.posSessionsService.findAll(query);
  }

  @Get('current')
  @UseGuards(PermissionsGuard)
  @Permissions('pos.access', 'pos.shift.view')
  current(
    @Req() req: Request,
    @Query('branchId') branchId?: string,
    @Query('storeId') storeId?: string,
    @Query('posTerminalId') posTerminalId?: string,
  ) {
    return this.posSessionsService.current(req, {
      branchId,
      storeId,
      posTerminalId,
    });
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('pos.access', 'pos.shift.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.posSessionsService.findOne(id);
  }

  @Post('open')
  @UseGuards(PermissionsGuard)
  @Permissions('pos.access', 'pos.shift.open')
  open(@Req() req: Request, @Body() dto: OpenPosSessionDto) {
    return this.posSessionsService.open(req, dto);
  }

  @Post(':id/close')
  @UseGuards(PermissionsGuard)
  @Permissions('pos.access', 'pos.shift.close')
  close(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ClosePosSessionDto,
  ) {
    return this.posSessionsService.close(id, dto);
  }
}
