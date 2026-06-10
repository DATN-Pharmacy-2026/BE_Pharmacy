import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CreateReportExportDto } from './dto/create-report-export.dto';
import { ExportReportDto } from './dto/export-report.dto';
import { QueryReportExportsDto } from './dto/query-report-exports.dto';
import { ReportExportsService } from './report-exports.service';
import { createReadStream } from 'fs';
import { Response } from 'express';

@ApiTags('report-exports')
@Controller('api/report-exports')
export class ReportExportsController {
  constructor(private readonly reportExportsService: ReportExportsService) {}

  @Get()
  findAll(@Query() query: QueryReportExportsDto) {
    return this.reportExportsService.findAll(query);
  }

  @Get('report/:reportJobId')
  findByReportJobId(
    @Param('reportJobId', new ParseUUIDPipe()) reportJobId: string,
    @Query() query: QueryReportExportsDto,
  ) {
    return this.reportExportsService.findByReportJobId(reportJobId, query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reportExportsService.findOne(id);
  }

  @Post()
  create(
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: CreateReportExportDto,
  ) {
    return this.reportExportsService.create(dto, req.user?.id);
  }

  @Post('generate/:reportJobId')
  generate(
    @Param('reportJobId', new ParseUUIDPipe()) reportJobId: string,
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: ExportReportDto,
  ) {
    return this.reportExportsService.generateForReportJob(
      reportJobId,
      dto,
      req.user?.id,
    );
  }

  @Get(':id/download')
  async download(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request & { user?: { id?: string } },
    @Res() res: Response,
  ) {
    const { exportItem, filePath } =
      await this.reportExportsService.resolveDownloadByExportId(id);
    const contentType =
      exportItem.fileType?.toUpperCase() === 'CSV'
        ? 'text/csv; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportItem.fileName}"`,
    );
    this.reportExportsService.recordDownloadAudit(exportItem.id, req.user?.id);

    createReadStream(filePath).pipe(res);
  }
}
