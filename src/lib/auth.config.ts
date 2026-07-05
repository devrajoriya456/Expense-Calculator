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
export default {
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
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
