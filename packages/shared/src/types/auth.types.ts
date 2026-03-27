export type UserRole = "ADMIN" | "INSTRUCTOR" | "STUDENT";

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
  email: string;
}

