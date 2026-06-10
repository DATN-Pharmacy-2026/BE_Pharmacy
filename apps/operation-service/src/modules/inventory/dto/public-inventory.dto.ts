import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PublicProductAvailabilityQueryDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @IsString()
  branchId!: string;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number = 1;
}

export class PublicCartAvailabilityItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class PublicCartAvailabilityDto {
  @ApiProperty()
  @IsString()
  branchId!: string;

  @ApiProperty({ type: [PublicCartAvailabilityItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PublicCartAvailabilityItemDto)
  items!: PublicCartAvailabilityItemDto[];
}
