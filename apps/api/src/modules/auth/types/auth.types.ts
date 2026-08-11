export interface JwtPayload {
  sub: string;
  email: string;
  roleId: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  roleId: string;
  roleName: string;
  permissions: { resource: string; action: string }[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}
