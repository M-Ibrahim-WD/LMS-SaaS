export type AppUserRole = "ADMIN" | "INSTRUCTOR" | "STUDENT";
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

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: AppUserRole;
  tenantId?: string | null;
  isSuperAdmin?: boolean;
  adminPermissions?: AdminPermission[];
  mustChangePassword?: boolean;
  exp?: number;
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  if (typeof atob === "function") {
    return decodeURIComponent(
      Array.from(atob(padded))
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
  }

  return Buffer.from(padded, "base64").toString("utf8");
}

export function decodeAuthToken(token?: string | null): JwtPayload | null {
  if (!token) {
    return null;
  }

  const segments = token.split(".");
  if (segments.length < 2) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(segments[1])) as JwtPayload;
  } catch {
    return null;
  }
}
