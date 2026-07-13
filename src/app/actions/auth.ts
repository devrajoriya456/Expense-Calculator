"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/nextauth-config";

/**
 * Server-side sign-out.
 *
 * The client-side `signOut()` from `next-auth/react` returned 200 on Netlify but
 * its cookie-clearing `Set-Cookie` never stuck, so the session survived and the
 * middleware bounced the user back to /dashboard. Moving it server-side helped,
 * but relying on `signOut({ redirectTo })` alone still leaves a gap: on Netlify
 * the delete `Set-Cookie` on the *redirect* response is unreliable, so the
 * `__Secure-authjs.session-token` cookie could survive — the signing-out tab
 * looked logged out (it navigated to /login) while other/new tabs, which share
 * the same cookie, stayed authenticated.
 *
 * To make sign-out deterministic we (1) run NextAuth's own sign-out without a
 * redirect, then (2) explicitly expire every session-cookie variant with the
 * exact attributes they were set with, then (3) redirect ourselves. Deleting
 * the cookie directly (not via a redirect's Set-Cookie) is what actually clears
 * the token for every tab.
 */
export async function signOutAction() {
  // Let Auth.js do its own teardown, but don't let it own the redirect/cookie.
  try {
    await signOut({ redirect: false });
  } catch {
    // signOut can throw on transient issues; we still clear cookies below.
  }

  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  // Must match the pinned cookie name/attributes in auth.config.ts. Auth.js
  // also splits large tokens into `.0`/`.1` chunks, so clear those too.
  const baseName = `${secure ? "__Secure-" : ""}authjs.session-token`;
  for (const name of [baseName, `${baseName}.0`, `${baseName}.1`]) {
    cookieStore.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
      expires: new Date(0),
    });
  }

  redirect("/login");
}
