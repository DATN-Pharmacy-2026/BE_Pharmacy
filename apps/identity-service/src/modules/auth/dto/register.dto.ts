import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'Customer full name' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ description: 'Customer email' })
  @IsEmail()
  @MaxLength(120)
  email!: string;

  @ApiPropertyOptional({ description: 'Username (optional)' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username?: string;

  @ApiPropertyOptional({ description: 'Phone number (optional)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ description: 'Plain password' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}

