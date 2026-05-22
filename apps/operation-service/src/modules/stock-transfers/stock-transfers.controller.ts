import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Request } from 'express';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { QueryStockTransfersDto } from './dto/query-stock-transfers.dto';
import { ReceiveStockTransferDto } from './dto/receive-stock-transfer.dto';
import { ShipStockTransferDto } from './dto/ship-stock-transfer.dto';
import { UpdateStockTransferStatusDto } from './dto/update-stock-transfer-status.dto';
import { StockTransfersService } from './stock-transfers.service';

@ApiTags('stock-transfers')
@ApiBearerAuth()
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@UseGuards(JwtAuthGuard)
@Controller('api/stock-transfers')
export class StockTransfersController {
  constructor(private readonly stockTransfersService: StockTransfersService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('stock_transfer.view')
  findAll(@Query() query: QueryStockTransfersDto) {
    return this.stockTransfersService.findAll(query);
  }

  @Get('transfer-no/:transferNo')
  @UseGuards(PermissionsGuard)
  @Permissions('stock_transfer.view')
  findByTransferNo(@Param('transferNo') transferNo: string) {
    return this.stockTransfersService.findByTransferNo(transferNo);
  }

  @Get(':id/timeline')
  @UseGuards(PermissionsGuard)
  @Permissions('stock_transfer.view')
  timeline(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.stockTransfersService.timeline(id);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('stock_transfer.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.stockTransfersService.findOne(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('stock_transfer.create')
  create(@Req() req: Request, @Body() dto: CreateStockTransferDto) {
    return this.stockTransfersService.create(req, dto);
  }

  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @Permissions('inventory.transfer')
  updateStatus(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateStockTransferStatusDto) {
    return this.stockTransfersService.updateStatus(id, dto);
  }

  @Post(':id/approve')
  @UseGuards(PermissionsGuard)
  @Permissions('stock_transfer.approve')
  approve(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    return this.stockTransfersService.approve(id, req);
  }

  @Post(':id/ship')
  @UseGuards(PermissionsGuard)
  @Permissions('stock_transfer.ship')
  ship(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request, @Body() dto: ShipStockTransferDto) {
    return this.stockTransfersService.ship(id, req, dto);
  }

  @Post(':id/receive')
  @UseGuards(PermissionsGuard)
  @Permissions('stock_transfer.receive')
  receive(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request, @Body() dto: ReceiveStockTransferDto) {
    return this.stockTransfersService.receive(id, req, dto);
  }

  @Post(':id/cancel')
  @UseGuards(PermissionsGuard)
  @Permissions('stock_transfer.cancel')
  cancel(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.stockTransfersService.cancel(id);
  }
}
