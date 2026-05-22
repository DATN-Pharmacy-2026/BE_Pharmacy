import { ApiProperty } from '@nestjs/swagger';

export class GatewayApiGroupDto {
  @ApiProperty()
  group!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  targetService!: string;

  @ApiProperty({ type: [String] })
  routes!: string[];

  @ApiProperty()
  authRequired!: boolean;
}
