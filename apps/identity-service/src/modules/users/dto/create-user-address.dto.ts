import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserAddressDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  receiverName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  addressLine: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  provinceCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  provinceName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  districtCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  districtName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  wardCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  wardName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
