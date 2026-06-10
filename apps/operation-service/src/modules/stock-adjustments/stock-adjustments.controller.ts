import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Request } from 'express';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { QueryStockAdjustmentsDto } from './dto/query-stock-adjustments.dto';
import { UpdateStockAdjustmentStatusDto } from './dto/update-stock-adjustment-status.dto';
import { StockAdjustmentsService } from './stock-adjustments.service';

@ApiTags('stock-adjustments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/stock-adjustments')
export class StockAdjustmentsController {
  constructor(
    private readonly stockAdjustmentsService: StockAdjustmentsService,
  ) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('stock_adjustment.view')
  findAll(@Query() query: QueryStockAdjustmentsDto) {
    return this.stockAdjustmentsService.findAll(query);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('stock_adjustment.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.stockAdjustmentsService.findOne(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('stock_adjustment.create')
  create(@Req() req: Request, @Body() dto: CreateStockAdjustmentDto) {
    return this.stockAdjustmentsService.create(req, dto);
  }

  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @Permissions('stock_adjustment.approve')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request,
    @Body() dto: UpdateStockAdjustmentStatusDto,
  ) {
    return this.stockAdjustmentsService.updateStatus(id, req, dto);
  }
}
