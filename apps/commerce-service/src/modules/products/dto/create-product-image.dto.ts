import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  isSupportedProductImageUrl,
  toRelativeUploadUrl,
} from '../../uploads/upload-url.util';

@ValidatorConstraint({ name: 'isProductImageUrl', async: false })
class IsProductImageUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && isSupportedProductImageUrl(value);
  }

  defaultMessage() {
    return 'url must be a valid http(s) URL or /api/uploads path';
  }
}

export class CreateProductImageDto {
  @ApiProperty()
  @Transform(({ value }) => toRelativeUploadUrl(value))
  @IsString()
  @Validate(IsProductImageUrlConstraint)
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alt?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
