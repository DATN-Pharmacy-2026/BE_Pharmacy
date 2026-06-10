import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WarehouseStatus, WarehouseType } from '.prisma/client/operation';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateWarehouseDto {
  @ApiPropertyOptional()
  @IsOptional()
  branchId?: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: WarehouseType })
  @IsOptional()
  @IsEnum(WarehouseType)
  type?: WarehouseType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCentral?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: WarehouseStatus })
  @IsOptional()
  @IsEnum(WarehouseStatus)
  status?: WarehouseStatus;
}
