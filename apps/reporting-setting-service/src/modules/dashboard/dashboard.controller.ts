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
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CreateDashboardSnapshotDto } from './dto/create-dashboard-snapshot.dto';
import { DashboardOverviewQueryDto } from './dto/dashboard-overview-query.dto';
import { QueryDashboardSnapshotsDto } from './dto/query-dashboard-snapshots.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(
    @Query() query: DashboardOverviewQueryDto,
    @Headers('x-branch-id') branchIdHeader?: string,
    @Headers('x-warehouse-id') warehouseIdHeader?: string,
  ) {
    return this.dashboardService.getOverview({
      ...query,
      branchId: query.branchId ?? branchIdHeader,
      warehouseId: query.warehouseId ?? warehouseIdHeader,
    });
  }

  @Get('snapshots')
  findSnapshots(
    @Query() query: QueryDashboardSnapshotsDto,
    @Headers('x-branch-id') branchIdHeader?: string,
    @Headers('x-warehouse-id') warehouseIdHeader?: string,
  ) {
    return this.dashboardService.findSnapshots({
      ...query,
      branchId: query.branchId ?? branchIdHeader,
      warehouseId: query.warehouseId ?? warehouseIdHeader,
    });
  }

  @Get('snapshots/:id')
  findSnapshotById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.dashboardService.findSnapshotById(id);
  }

  @Post('snapshots')
  createSnapshot(@Body() dto: CreateDashboardSnapshotDto) {
    return this.dashboardService.createSnapshot(dto);
  }
}
