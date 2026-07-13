import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * Edge-safe Auth.js configuration.
 *
 * This module contains ONLY code that can run in the Edge runtime (used by
 * middleware): the OAuth provider, cookie/session settings, the JWT secret, and
 * the token/session shaping callbacks. It must NOT import Node-only libraries
 * such as `bcryptjs`, `pg`, or the Supabase admin client — those live in
 * `nextauth-config.ts`, which runs only in the Node handler.
 *
 * Both the full server config and the middleware build their NextAuth instance
 * from this base, so they agree on the secret and cookie names and therefore
 * read/write the exact same session token.
 */
// Pin cookie name + attributes explicitly instead of letting Auth.js
// auto-derive them per runtime. On Netlify the Edge middleware and the Node
// auth handler could otherwise disagree (or the sign-out delete could omit an
// attribute), which makes the delete Set-Cookie fail to match the existing
// `__Secure-` cookie — so sign-out returned a 200 but never cleared the token,
// and middleware bounced the user back to /dashboard. Pinning here guarantees
// set / read / delete all target the exact same cookie.
const useSecureCookies = process.env.NODE_ENV === "production";

export default {
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies,
  cookies: {
    sessionToken: {
      name: `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id || token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
