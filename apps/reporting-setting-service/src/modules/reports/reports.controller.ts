import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { Request } from 'express';
import { ExportReportDto } from '../report-exports/dto/export-report.dto';
import { CreateReportJobDto } from './dto/create-report-job.dto';
import { QueryReportJobsDto } from './dto/query-report-jobs.dto';
import { ReportSummaryQueryDto } from './dto/report-summary-query.dto';
import { UpdateReportJobStatusDto } from './dto/update-report-job-status.dto';
import { ReportsService } from './reports.service';

import { UseGuards } from '@nestjs/common';

@ApiTags('reports')
@ApiHeader({ name: 'x-branch-id', required: false })
@ApiHeader({ name: 'x-warehouse-id', required: false })
@UseGuards(JwtAuthGuard)
@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('types')
  @UseGuards(PermissionsGuard)
  @Permissions('report.view')
  getTypes() {
    return this.reportsService.getTypes();
  }

  @Get('summary')
  @UseGuards(PermissionsGuard)
  @Permissions('report.view')
  summary(
    @Query() query: ReportSummaryQueryDto,
    @Headers('x-branch-id') branchIdHeader?: string,
    @Headers('x-warehouse-id') warehouseIdHeader?: string,
  ) {
    return this.reportsService.summary({
      ...query,
      branchId: query.branchId ?? branchIdHeader,
      warehouseId: query.warehouseId ?? warehouseIdHeader,
    });
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('report.view')
  findAll(
    @Query() query: QueryReportJobsDto,
    @Headers('x-branch-id') branchIdHeader?: string,
    @Headers('x-warehouse-id') warehouseIdHeader?: string,
  ) {
    return this.reportsService.findAll({
      ...query,
      branchId: query.branchId ?? branchIdHeader,
      warehouseId: query.warehouseId ?? warehouseIdHeader,
    });
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('report.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reportsService.findOne(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('report.view')
  create(
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: CreateReportJobDto,
    @Headers('x-branch-id') branchIdHeader?: string,
    @Headers('x-warehouse-id') warehouseIdHeader?: string,
  ) {
    return this.reportsService.create(
      {
        ...dto,
        branchId: dto.branchId ?? branchIdHeader,
        warehouseId: dto.warehouseId ?? warehouseIdHeader,
      },
      req.user?.id,
    );
  }

  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @Permissions('report.view')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: UpdateReportJobStatusDto,
  ) {
    return this.reportsService.updateStatus(id, dto, req.user?.id);
  }

  @Post(':id/process')
  @UseGuards(PermissionsGuard)
  @Permissions('report.view')
  process(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: ExportReportDto,
  ) {
    return this.reportsService.process(id, dto, req.user?.id);
  }
}
