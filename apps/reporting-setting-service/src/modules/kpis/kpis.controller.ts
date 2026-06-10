import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CreateKpiSnapshotDto } from './dto/create-kpi-snapshot.dto';
import { QueryKpiSnapshotsDto } from './dto/query-kpi-snapshots.dto';
import { KpisService } from './kpis.service';

@ApiTags('kpis')
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@Controller('api/kpis')
export class KpisController {
  constructor(private readonly kpisService: KpisService) {}

  @Get()
  findAll(
    @Query() query: QueryKpiSnapshotsDto,
    @Headers('x-branch-id') branchIdHeader?: string,
    @Headers('x-warehouse-id') warehouseIdHeader?: string,
  ) {
    return this.kpisService.findAll({
      ...query,
      branchId: query.branchId ?? branchIdHeader,
      warehouseId: query.warehouseId ?? warehouseIdHeader,
    });
  }

  @Get('metric/:metricCode')
  findByMetric(
    @Param('metricCode') metricCode: string,
    @Query() query: QueryKpiSnapshotsDto,
  ) {
    return this.kpisService.findByMetric(metricCode, query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.kpisService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateKpiSnapshotDto) {
    return this.kpisService.create(dto);
  }

  @Post('bulk')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          items: { $ref: '#/components/schemas/CreateKpiSnapshotDto' },
        },
      },
    },
  })
  bulkCreate(@Body() payload: { items: CreateKpiSnapshotDto[] }) {
    return this.kpisService.bulkCreate(payload);
  }
}
