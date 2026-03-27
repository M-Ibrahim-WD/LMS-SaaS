import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeAuthToken } from "./lib/auth/token";

const publicAuthPaths = ["/login", "/register"];
const adminPasswordResetPath = "/admin/change-password";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  const pathname = request.nextUrl.pathname;
  const isPublicAuth = publicAuthPaths.some((path) => pathname.startsWith(path));
  const isProtected =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/subscription") ||
    pathname.startsWith("/join-tenant") ||
    pathname.startsWith("/instructor") ||
    pathname.startsWith("/courses") ||
    pathname.startsWith("/my-courses") ||
    pathname.startsWith("/certificates");
  const payload = decodeAuthToken(token);

  if (process.env.NODE_ENV !== "production") {
    console.info("[middleware]", {
      pathname,
      hasToken: Boolean(token),
      role: payload?.role ?? null,
      isProtected,
      isPublicAuth
    });
  }

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicAuth && token) {
    const destination = payload?.mustChangePassword && payload.role === "ADMIN" ? adminPasswordResetPath : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (!payload?.role) {
    return NextResponse.next();
  }

  if (payload.mustChangePassword && payload.role === "ADMIN" && pathname !== adminPasswordResetPath) {
    return NextResponse.redirect(new URL(adminPasswordResetPath, request.url));
  }

  if (pathname.startsWith("/instructor") && payload.role !== "INSTRUCTOR") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/admin") && payload.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/subscription") && payload.role !== "INSTRUCTOR") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    (pathname.startsWith("/my-courses") ||
      pathname.startsWith("/join-tenant") ||
      pathname.startsWith("/certificates")) &&
    payload.role !== "STUDENT"
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/subscription/:path*",
    "/join-tenant",
    "/instructor/:path*",
    "/courses/:path*",
    "/my-courses/:path*",
    "/certificates/:path*",
    "/login",
    "/register"
  ]
};
