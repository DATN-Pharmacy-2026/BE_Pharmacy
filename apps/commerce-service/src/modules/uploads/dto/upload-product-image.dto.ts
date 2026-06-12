import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class UploadProductImageDto {
  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] })
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  mimeType!: 'image/jpeg' | 'image/png' | 'image/webp';

  @ApiProperty({ description: 'Base64 data URL or raw base64 content' })
  @IsString()
  data!: string;
}
