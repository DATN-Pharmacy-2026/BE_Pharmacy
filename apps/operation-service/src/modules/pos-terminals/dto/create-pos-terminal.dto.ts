import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { POSTerminalStatus } from '.prisma/client/operation';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreatePosTerminalDto {
  @ApiProperty()
  branchId!: string;

  @ApiProperty()
  storeId!: string;

  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceSerial?: string;

  @ApiPropertyOptional({ enum: POSTerminalStatus })
  @IsOptional()
  @IsEnum(POSTerminalStatus)
  status?: POSTerminalStatus;
}
