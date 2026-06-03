import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
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
