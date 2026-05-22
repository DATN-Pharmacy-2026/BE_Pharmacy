import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GatewayStandardResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  data!: unknown;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  requestId?: string;

  @ApiProperty()
  timestamp!: string;
}
