import { PartialType } from '@nestjs/swagger';
import { AssignUserBranchAccessDto } from './assign-user-branch-access.dto';

export class UpdateUserBranchAccessDto extends PartialType(
  AssignUserBranchAccessDto,
) {}
