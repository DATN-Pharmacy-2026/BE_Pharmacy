import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportJobStatus } from '.prisma/client/reporting';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class UpdateReportJobStatusDto {
  @ApiProperty({ enum: ReportJobStatus })
  @IsEnum(ReportJobStatus)
  status!: ReportJobStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
