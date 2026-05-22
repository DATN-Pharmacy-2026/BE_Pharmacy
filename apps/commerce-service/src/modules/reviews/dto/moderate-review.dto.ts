import { ApiProperty } from '@nestjs/swagger';
import { ReviewStatus } from '.prisma/client/commerce';
import { IsEnum } from 'class-validator';

export class ModerateReviewDto {
  @ApiProperty({ enum: ReviewStatus })
  @IsEnum(ReviewStatus)
  status!: ReviewStatus;
}
