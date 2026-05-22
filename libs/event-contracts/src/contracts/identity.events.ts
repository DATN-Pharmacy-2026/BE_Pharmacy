export interface IdentityUserCreatedPayload {
  userId: string;
  email?: string | null;
  roleCodes?: string[];
  branchId?: string | null;
  createdAt: string;
}

export interface IdentityUserRoleChangedPayload {
  userId: string;
  roleCodes: string[];
  changedAt: string;
}
