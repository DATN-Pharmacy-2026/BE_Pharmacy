export interface AccessInfo {
  id: string;
  roleId?: string | null;
  status: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  isSystemAdmin: boolean;
  roles: string[];
  permissions: string[];
  branchIds: string[];
  warehouseIds: string[];
  branchAccess: AccessInfo[];
  warehouseAccess: AccessInfo[];
}
