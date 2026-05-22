import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Request } from 'express';
import { CreatePosOrderDto } from './dto/create-pos-order.dto';
import { QueryPosOrdersDto } from './dto/query-pos-orders.dto';
import { RefundPosOrderDto } from './dto/refund-pos-order.dto';
import { UpdatePosOrderStatusDto } from './dto/update-pos-order-status.dto';
import { PosOrdersService } from './pos-orders.service';

@ApiTags('pos-orders')
@ApiBearerAuth()
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@UseGuards(JwtAuthGuard)
@Controller('api/pos-orders')
export class PosOrdersController {
  constructor(private readonly posOrdersService: PosOrdersService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('pos_order.view')
  findAll(@Query() query: QueryPosOrdersDto) {
    return this.posOrdersService.findAll(query);
  }

  @Get('order-no/:orderNo')
  @UseGuards(PermissionsGuard)
  @Permissions('pos_order.view')
  findByOrderNo(@Param('orderNo') orderNo: string) {
    return this.posOrdersService.findByOrderNo(orderNo);
  }

  @Get('session/:posSessionId')
  @UseGuards(PermissionsGuard)
  @Permissions('pos_order.view')
  findBySession(@Param('posSessionId', new ParseUUIDPipe()) posSessionId: string) {
    return this.posOrdersService.findBySession(posSessionId);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('pos_order.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.posOrdersService.findOne(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('pos.sell')
  create(@Req() req: Request, @Body() dto: CreatePosOrderDto) {
    return this.posOrdersService.create(req, dto);
  }

  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @Permissions('pos_order.update')
  updateStatus(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdatePosOrderStatusDto) {
    return this.posOrdersService.updateStatus(id, dto);
  }

  @Post(':id/refund')
  @UseGuards(PermissionsGuard)
  @Permissions('pos.refund')
  refund(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request, @Body() dto: RefundPosOrderDto) {
    return this.posOrdersService.refund(id, req, dto);
  }
}
