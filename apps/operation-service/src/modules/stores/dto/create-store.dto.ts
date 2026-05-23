import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoreStatus } from '.prisma/client/operation';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateStoreDto {
  @ApiProperty()
  branchId!: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  address!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: StoreStatus })
  @IsOptional()
  @IsEnum(StoreStatus)
  status?: StoreStatus;
}
