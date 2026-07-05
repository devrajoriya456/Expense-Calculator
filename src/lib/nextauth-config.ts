import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import authConfig from "@/lib/auth.config";
import { getSupabaseConfigError, supabaseAdmin } from "@/lib/supabase";
import { rateLimit } from "@/lib/rateLimit";

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth({
  // Shared edge-safe base (trustHost, secret, session, pages, Google provider,
  // jwt/session callbacks). The Node-only Credentials provider and the
  // Supabase-backed signIn callback are added on top here.
  ...authConfig,
  providers: [
    ...authConfig.providers,
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const configError = getSupabaseConfigError();
        if (configError) {
          throw new Error(configError);
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        // Throttle repeated attempts against the same account to blunt
        // brute-force / credential-stuffing. (In-memory; see rateLimit.ts.)
        if (!rateLimit(`login:${email}`, 10, 15 * 60 * 1000)) {
          throw new Error("Too many attempts. Please try again later.");
        }

        const { data: user, error } = await supabaseAdmin
          .from("users")
          .select("*")
          .eq("email", email)
          .maybeSingle();

        if (error || !user || !user.password_hash) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          password,
          user.password_hash,
        );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.profile_image,
        };
      },
    }),
  ],
  callbacks: {
    // Preserve the edge-safe jwt/session shaping from the shared config, and
    // add the Node-only signIn callback (Supabase account linking) on top.
    ...authConfig.callbacks,
    async signIn({ user, account, profile }: any) {
      if (account?.provider === "google") {
        // Google must have verified the email before we trust it for
        // account linking, otherwise a spoofed email could take over an account.
        if (profile && profile.email_verified === false) {
          return false;
        }
        const email = user.email?.toLowerCase();
        if (!email) return false;

        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (!existingUser) {
          const { data: createdUser } = await supabaseAdmin
            .from("users")
            .insert({
              email,
              name: user.name || email,
              profile_image: user.image,
              auth_provider: "google",
            })
            .select("id")
            .single();
          if (createdUser?.id) {
            user.id = createdUser.id;
          }
        } else {
          await supabaseAdmin
            .from("users")
            .update({
              auth_provider: "google",
              profile_image: user.image,
            })
            .eq("id", existingUser.id);
          user.id = existingUser.id;
        }
      }
      return true;
    },
  },
});
