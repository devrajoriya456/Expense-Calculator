import { NextResponse, type NextRequest } from "next/server";

/**
 * Deterministic sign-out — the single logout flow for the whole app.
 *
 * Why this is a Route Handler and not a Server Action:
 * The previous implementation expired the session cookie inside a Server
 * Action that ended in `redirect()`. That makes the delete `Set-Cookie` ride
 * on the action's response, which Netlify's Next.js runtime drops when the
 * action redirects — so the browser navigated to /login but never applied the
 * expiry, and `__Secure-authjs.session-token` (a 30-day persistent cookie)
 * survived a browser restart, keeping the user logged in.
 *
 * Here the cookie deletions are attached to the SAME NextResponse redirect we
 * return. It is an ordinary HTTP 303 with Set-Cookie headers, which the
 * browser MUST process before following the Location — and which Netlify
 * forwards reliably. With JWT sessions the cookie *is* the session, so
 * removing it fully invalidates the session for every tab, including Google
 * OAuth users (same cookie, same removal).
 */
function buildSignOutResponse(request: NextRequest) {
  const secure = process.env.NODE_ENV === "production";

  // 303 See Other: the browser converts the POST into a GET of /login, so we
  // land on the login page cleanly with no method-mismatch. Use nextUrl.origin
  // so the redirect targets the real public host behind Netlify's proxy.
  const res = NextResponse.redirect(new URL("/login", request.nextUrl.origin), {
    status: 303,
  });

  // Attributes must match how auth.config.ts set the cookie (name prefix, path,
  // secure, sameSite, httpOnly) so the browser matches and overwrites it.
  const prefix = secure ? "__Secure-" : "";
  const base = `${prefix}authjs.session-token`;

  // Auth.js chunks large JWTs into .0/.1 — clear every variant that can exist.
  // csrf/callback cookies don't authenticate, but clearing them avoids stale
  // state. csrf uses the __Host- prefix in production, not __Secure-.
  const cookieNames = [
    base,
    `${base}.0`,
    `${base}.1`,
    `${secure ? "__Host-" : ""}authjs.csrf-token`,
    `${prefix}authjs.callback-url`,
  ];

  for (const name of cookieNames) {
    res.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
      expires: new Date(0), // in the past -> browser removes it immediately
      maxAge: 0,
    });
  }

  return res;
}

// The Navbar submits a POST form here (state-changing action -> POST, not GET).
export async function POST(request: NextRequest) {
  return buildSignOutResponse(request);
}
