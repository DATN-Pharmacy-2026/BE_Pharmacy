import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { POSTerminalStatus } from '.prisma/client/operation';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePosTerminalDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty()
  @IsUUID()
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
