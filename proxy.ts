import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { USER_COOKIE_NAME } from "@/lib/userAuth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`🌐 [PROXY] ${request.method} ${pathname}`);
  const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const cookieUserToken = request.cookies.get(USER_COOKIE_NAME)?.value;
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const userToken = cookieUserToken || bearerToken;

  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLoginRoute = pathname === "/admin/login";
  const isAdminApiRoute = pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/auth/login");

  const isUserDashboardRoute = pathname.startsWith("/dashboard");
  const isUserApiRoute = pathname.startsWith("/api/user");

  // Protect /admin routes (except /admin/login)
  if (isAdminRoute && !isAdminLoginRoute) {
    if (!adminToken) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect logged-in admin away from /admin/login to /admin
  if (isAdminLoginRoute && adminToken) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Guard /api/admin/* routes
  if (isAdminApiRoute && !adminToken) {
    return NextResponse.json(
      { error: "Unauthorized access to admin API." },
      { status: 401 }
    );
  }

  // Protect /dashboard routes
  if (isUserDashboardRoute && !userToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Guard /api/user/* routes
  if (isUserApiRoute && !userToken) {
    return NextResponse.json(
      { error: "Unauthorized access to student API." },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/dashboard/:path*", "/api/user/:path*"],
};
