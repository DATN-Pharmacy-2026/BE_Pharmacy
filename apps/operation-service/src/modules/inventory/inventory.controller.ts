import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { InventoryService } from './inventory.service';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { QueryLowStockInventoryDto } from './dto/query-low-stock-inventory.dto';
import { QueryExpiringInventoryDto } from './dto/query-expiring-inventory.dto';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('inventory.view')
  findAll(@Query() query: QueryInventoryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get('product/:productId')
  @UseGuards(PermissionsGuard)
  @Permissions('inventory.view')
  findByProduct(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Query() query: QueryInventoryDto,
  ) {
    return this.inventoryService.findByProduct(productId, query);
  }

  @Get('warehouse/:warehouseId')
  @UseGuards(PermissionsGuard)
  @Permissions('inventory.view')
  findByWarehouse(
    @Param('warehouseId', new ParseUUIDPipe()) warehouseId: string,
    @Query() query: QueryInventoryDto,
  ) {
    return this.inventoryService.findByWarehouse(warehouseId, query);
  }

  @Get('low-stock')
  @UseGuards(PermissionsGuard)
  @Permissions('inventory.view')
  lowStock(@Query() query: QueryLowStockInventoryDto) {
    return this.inventoryService.lowStock(query);
  }

  @Get('expiring')
  @UseGuards(PermissionsGuard)
  @Permissions('inventory.view')
  expiring(@Query() query: QueryExpiringInventoryDto) {
    return this.inventoryService.expiring(query);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('inventory.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.inventoryService.findOne(id);
  }
}
