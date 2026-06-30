import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const pathname = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/signup", "/api/auth"];

  // Check if route is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // If route requires auth and user is not authenticated, redirect to login
  if (!isPublicRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If user is authenticated and tries to access login, redirect to dashboard
  if (token && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
