import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditLogsService } from './audit-logs.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@ApiTags('audit-logs')
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@Controller('api/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query() query: QueryAuditLogsDto) {
    return this.auditLogsService.findAll(query);
  }

  @Get('entity/:entityType/:entityId')
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() query: QueryAuditLogsDto,
  ) {
    return this.auditLogsService.findByEntity(entityType, entityId, query);
  }

  @Get('user/:actorUserId')
  findByUser(
    @Param('actorUserId', new ParseUUIDPipe()) actorUserId: string,
    @Query() query: QueryAuditLogsDto,
  ) {
    return this.auditLogsService.findByUser(actorUserId, query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.auditLogsService.findOne(id);
  }

  @Post()
  create(
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: CreateAuditLogDto,
    @Headers('x-branch-id') branchIdHeader?: string,
    @Headers('x-warehouse-id') warehouseIdHeader?: string,
  ) {
    const actorUserId = dto.actorUserId ?? req.user?.id;
    const ipAddress = dto.ipAddress ?? req.ip;
    const userAgent = dto.userAgent ?? req.header('user-agent');
    return this.auditLogsService.create({
      ...dto,
      actorUserId,
      branchId: dto.branchId ?? branchIdHeader,
      warehouseId: dto.warehouseId ?? warehouseIdHeader,
      ipAddress,
      userAgent,
    });
  }
}
