export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  isSystemAdmin: boolean;
  roles: string[];
  branchIds: string[];
  warehouseIds: string[];
  tokenType: 'access' | 'refresh';
  refreshTokenId?: string;
}
