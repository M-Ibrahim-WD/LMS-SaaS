export type UserRole = "ADMIN" | "INSTRUCTOR" | "STUDENT";
export type AdminPermission =
  | "VIEW_OVERVIEW"
  | "REVIEW_TENANTS"
  | "MANAGE_TENANTS"
  | "REVIEW_STUDENTS"
  | "REVIEW_INSTRUCTORS"
  | "MANAGE_USERS"
  | "REVIEW_COURSES"
  | "REVIEW_PAYMENTS"
  | "MANAGE_PLANS"
  | "REVIEW_ADMINS";

export interface JwtPayload {
  sub: string;
  tenantId: string | null;
  role: UserRole;
  email: string;
  isSuperAdmin?: boolean;
  adminPermissions?: AdminPermission[];
  mustChangePassword?: boolean;
}
