import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { QueryStockMovementsDto } from './dto/query-stock-movements.dto';
import { StockMovementsService } from './stock-movements.service';

@ApiTags('stock-movements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('stock_movement.view')
  findAll(@Query() query: QueryStockMovementsDto) {
    return this.stockMovementsService.findAll(query);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('stock_movement.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.stockMovementsService.findOne(id);
  }
}
