import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AskChatbotDto {
  @ApiProperty({ description: 'User question for chatbot' })
  @IsString()
  @MaxLength(1000)
  query!: string;

  @ApiPropertyOptional({ description: 'Number of sources to return', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  topK?: number;
}

