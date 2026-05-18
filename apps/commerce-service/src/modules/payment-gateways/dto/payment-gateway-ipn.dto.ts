import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PaymentGatewayIpnDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  providerOrderId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  requestId?: string;
}
