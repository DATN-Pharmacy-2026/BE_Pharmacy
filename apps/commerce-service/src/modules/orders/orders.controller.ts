import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Request } from 'express';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Permissions('order.view')
  findAll(@Req() req: Request, @Query() query: QueryOrdersDto) {
    return this.ordersService.findAll(query, req);
  }

  @Get('my')
  @Permissions('customer.order.view_self')
  findMy(@Req() req: Request, @Query() query: QueryOrdersDto) {
    return this.ordersService.findMyOrders(req, query);
  }

  @Get('order-no/:orderNo')
  @Permissions('order.view')
  findByOrderNo(@Param('orderNo') orderNo: string, @Req() req: Request) {
    return this.ordersService.findByOrderNo(orderNo, req);
  }

  @Get(':id')
  @Permissions('order.view|customer.order.view_self')
  findOne(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    return this.ordersService.findOne(id, req);
  }

  @Patch(':id/status')
  @Permissions('order.update')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Patch(':id/cancel')
  @Permissions('order.cancel|customer.order.cancel_self')
  cancelOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(id, dto, req);
  }
}
