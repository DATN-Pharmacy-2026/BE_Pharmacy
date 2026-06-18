import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HandoffStatus } from '../handoff.service';

export class HandoffListQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'IN_PROGRESS', 'RESOLVED'])
  status?: HandoffStatus;
}

export class UpdateHandoffTicketDto {
  @IsIn(['PENDING', 'IN_PROGRESS', 'RESOLVED'])
  status!: HandoffStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  responseNote?: string;
}

export class AssignHandoffTicketDto {
  @IsString()
  assignedUserId!: string;

  @IsOptional()
  @IsString()
  assignedByUserId?: string;

  @IsOptional()
  @IsIn(['MANUAL', 'ACTIVE_POS_SESSION'])
  assignmentSource?: 'MANUAL' | 'ACTIVE_POS_SESSION';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  responseNote?: string;
}

export class PublicHandoffConversationMessageDto {
  @IsString()
  @MaxLength(30)
  role!: string;

  @IsString()
  @MaxLength(4000)
  content!: string;
}

export class CreatePublicHandoffDto {
  @IsOptional()
  @IsIn(['PUBLIC_CHATBOT'])
  source?: 'PUBLIC_CHATBOT';

  @IsIn(['MEDICAL_SAFETY', 'CHATBOT_UNSURE', 'PRODUCT_ADVICE'])
  reason!: 'MEDICAL_SAFETY' | 'CHATBOT_UNSURE' | 'PRODUCT_ADVICE';

  @IsString()
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicHandoffConversationMessageDto)
  conversation?: PublicHandoffConversationMessageDto[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customerEmail?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  latestChatbotReply?: string;
}
