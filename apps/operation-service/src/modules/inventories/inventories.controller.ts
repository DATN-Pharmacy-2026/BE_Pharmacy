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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Request } from 'express';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { InitialStockDto } from './dto/initial-stock.dto';
import { QueryInventoriesDto } from './dto/query-inventories.dto';
import { TransferInventoryDto } from './dto/transfer-inventory.dto';
import { InventoriesService } from './inventories.service';
import { TenantContextService } from './tenant-context.service';

@ApiTags('inventories')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true })
@UseGuards(JwtAuthGuard)
@Controller('api/inventories')
export class InventoriesController {
  constructor(
    private readonly inventoriesService: InventoriesService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List inventories' })
  findAll(
    @Headers() headers: Record<string, unknown>,
    @Query() query: QueryInventoriesDto,
  ) {
    const tenantId = this.tenantContextService.getTenantId(headers);
    return this.inventoriesService.findAll(tenantId, query);
  }

  @Get('warehouse/:warehouseId')
  findByWarehouse(
    @Headers() headers: Record<string, unknown>,
    @Param('warehouseId', new ParseUUIDPipe()) warehouseId: string,
    @Query() query: QueryInventoriesDto,
  ) {
    const tenantId = this.tenantContextService.getTenantId(headers);
    return this.inventoriesService.findByWarehouse(
      tenantId,
      warehouseId,
      query,
    );
  }

  @Get('warehouse/:warehouseId/product/:productId')
  findByWarehouseAndProduct(
    @Headers() headers: Record<string, unknown>,
    @Param('warehouseId', new ParseUUIDPipe()) warehouseId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ) {
    const tenantId = this.tenantContextService.getTenantId(headers);
    return this.inventoriesService.findOneByWarehouseProduct(
      tenantId,
      warehouseId,
      productId,
    );
  }

  @Get(':id')
  findOne(
    @Headers() headers: Record<string, unknown>,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tenantId = this.tenantContextService.getTenantId(headers);
    return this.inventoriesService.findOne(tenantId, id);
  }

  @Post('initial-stock')
  @UseGuards(PermissionsGuard)
  @Permissions('warehouse.manage')
  createInitialStock(
    @Headers() headers: Record<string, unknown>,
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: InitialStockDto,
  ) {
    const tenantId = this.tenantContextService.getTenantId(headers);
    const userId = req.user?.id ?? '00000000-0000-0000-0000-000000000000';
    return this.inventoriesService.createInitialStock(tenantId, userId, dto);
  }

  @Post('adjust')
  @UseGuards(PermissionsGuard)
  @Permissions('warehouse.manage')
  adjust(
    @Headers() headers: Record<string, unknown>,
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: AdjustInventoryDto,
  ) {
    const tenantId = this.tenantContextService.getTenantId(headers);
    const userId = req.user?.id ?? '00000000-0000-0000-0000-000000000000';
    return this.inventoriesService.adjust(tenantId, userId, dto);
  }

  @Post('transfer')
  @UseGuards(PermissionsGuard)
  @Permissions('warehouse.manage')
  transfer(
    @Headers() headers: Record<string, unknown>,
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: TransferInventoryDto,
  ) {
    const tenantId = this.tenantContextService.getTenantId(headers);
    const userId = req.user?.id ?? '00000000-0000-0000-0000-000000000000';
    return this.inventoriesService.transfer(tenantId, userId, dto);
  }
}
