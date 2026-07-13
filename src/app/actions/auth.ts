"use server";

import { signOut } from "@/lib/nextauth-config";

/**
 * Server-side sign-out.
 *
 * The client-side `signOut()` from `next-auth/react` returned 200 on Netlify but
 * its cookie-clearing `Set-Cookie` never stuck, so the session survived and the
 * middleware bounced the user back to /dashboard. Running `signOut` on the
 * server clears the session cookie AND issues the /login redirect in a single
 * response, so there's no window where the browser navigates while still
 * holding a valid session token.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
