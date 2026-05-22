import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { QueryShipmentsDto } from './dto/query-shipments.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { ShipmentsService } from './shipments.service';

@ApiTags('shipments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('shipment.view')
  findAll(@Query() query: QueryShipmentsDto) {
    return this.shipmentsService.findAll(query);
  }

  @Get('stock-transfer/:stockTransferId')
  @UseGuards(PermissionsGuard)
  @Permissions('shipment.view')
  findByStockTransferId(@Param('stockTransferId', new ParseUUIDPipe()) stockTransferId: string) {
    return this.shipmentsService.findByStockTransferId(stockTransferId);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('shipment.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.shipmentsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @Permissions('shipment.update')
  updateStatus(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateShipmentStatusDto) {
    return this.shipmentsService.updateStatus(id, dto);
  }
}
