import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GatewayServiceTargetDto {
  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  healthPath!: string;

  @ApiPropertyOptional()
  status?: string;
}
