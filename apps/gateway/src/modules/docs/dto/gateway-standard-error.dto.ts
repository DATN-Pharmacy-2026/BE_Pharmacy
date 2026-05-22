import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GatewayStandardErrorDto {
  @ApiProperty()
  statusCode!: number;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional()
  service?: string;

  @ApiProperty()
  path!: string;

  @ApiPropertyOptional()
  requestId?: string;

  @ApiProperty()
  timestamp!: string;
}
