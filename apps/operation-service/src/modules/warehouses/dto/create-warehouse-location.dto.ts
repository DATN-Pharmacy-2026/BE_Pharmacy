import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationStatus, LocationType } from '.prisma/client/operation';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateWarehouseLocationDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: LocationType })
  @IsEnum(LocationType)
  type!: LocationType;

  @ApiPropertyOptional({ enum: LocationStatus })
  @IsOptional()
  @IsEnum(LocationStatus)
  status?: LocationStatus;
}
