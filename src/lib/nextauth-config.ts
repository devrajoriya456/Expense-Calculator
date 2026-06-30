import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getSupabaseConfigError, supabaseAdmin } from "@/lib/supabase";

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
    }),
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
    async signIn({ user, account }: any) {
      if (account?.provider === "google") {
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
  pages: {
    signIn: "/login",
  },
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
});
