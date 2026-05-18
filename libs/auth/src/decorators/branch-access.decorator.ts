import { SetMetadata } from '@nestjs/common';

export const BRANCH_ACCESS_KEY = 'branch_access_required';
export const BranchAccess = () => SetMetadata(BRANCH_ACCESS_KEY, true);
