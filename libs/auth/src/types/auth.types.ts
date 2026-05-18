export interface AuthContext {
  userId: string;
  roles: string[];
  permissions?: string[];
}

export interface JwtPayloadPlaceholder {
  sub: string;
  exp?: number;
  iat?: number;
}
