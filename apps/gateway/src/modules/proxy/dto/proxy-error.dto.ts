import { ApiProperty } from '@nestjs/swagger';

export class ProxyErrorDto {
  @ApiProperty()
  statusCode!: number;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  service!: string;

  @ApiProperty()
  path!: string;
}
