import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/lib/auth.config";

// Build a lightweight, edge-safe NextAuth instance from the shared base config.
// Because it uses the SAME secret and cookie settings as the server handler in
// nextauth-config.ts, `req.auth` reliably reflects the logged-in session — in
// local dev AND behind Netlify's HTTPS proxy (where the browser stores the
// `__Secure-authjs.session-token` cookie).
const { auth } = NextAuth(authConfig);

export default auth((request) => {
  // req.auth is the decoded session (with user) when authenticated, else null.
  const token = request.auth;
  const pathname = request.nextUrl.pathname;

  // API routes enforce their own auth and return JSON (401/403). Never redirect
  // them to the HTML login page — that would break client fetch() calls.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Public pages that don't require authentication.
  // "/" must match exactly (every path startsWith "/"), while prefixes like
  // "/invite" cover their subpaths.
  const exactPublicRoutes = ["/", "/login", "/signup"];
  const prefixPublicRoutes = ["/invite"];

  const isPublicRoute =
    exactPublicRoutes.includes(pathname) ||
    prefixPublicRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

  // If a page requires auth and the user is not authenticated, redirect to login
  if (!isPublicRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    // Preserve where they were headed so they return after signing in.
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and tries to access login, redirect to dashboard
  if (token && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
});

// Configure which routes to run middleware on.
// Exclude Next internals and any path with a file extension (manifest.json,
// sw.js, icon.svg, images, etc.) so static assets — which browsers often fetch
// without credentials — are never redirected to the login page.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
