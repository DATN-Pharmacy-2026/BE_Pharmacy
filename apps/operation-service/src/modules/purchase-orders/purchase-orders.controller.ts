import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Request } from 'express';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { QueryPurchaseOrdersDto } from './dto/query-purchase-orders.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-purchase-order-status.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@UseGuards(JwtAuthGuard)
@Controller('api/purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('purchase_order.view')
  findAll(@Query() query: QueryPurchaseOrdersDto) {
    return this.purchaseOrdersService.findAll(query);
  }

  @Get('po-no/:poNo')
  @UseGuards(PermissionsGuard)
  @Permissions('purchase_order.view')
  findByPoNo(@Param('poNo') poNo: string) {
    return this.purchaseOrdersService.findByPoNo(poNo);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('purchase_order.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('purchase_order.create')
  create(@Req() req: Request, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(req, dto);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('purchase_order.update')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.purchaseOrdersService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @Permissions('purchase_order.approve')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @Body() dto: UpdatePurchaseOrderStatusDto,
  ) {
    return this.purchaseOrdersService.updateStatus(id, req, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('purchase_order.cancel')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.purchaseOrdersService.remove(id);
  }
}
