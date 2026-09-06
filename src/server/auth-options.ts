import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";

/**
 * Staff sign-in only, for now — User rows carry a passwordHash (see
 * schema.prisma) so this Credentials provider can check it directly. The
 * client portal is meant to be passwordless (magic-link, per
 * ARCHITECTURE.md §5), but Client has no verification-token storage yet
 * (that needs a NextAuth Prisma Adapter + the Account/Session/
 * VerificationToken tables, which schema.prisma doesn't have) — wiring
 * that up is a deliberate follow-up, not done here, rather than half-built
 * against tables that don't exist.
 *
 * The JWT carries { userId, pressId, role } so middleware.ts's getToken()
 * call and src/server/auth.ts's getSession() both read the same shape.
 */
export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/api/auth/signin" },
  providers: [
    CredentialsProvider({
      name: "Staff Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await db.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, pressId: user.pressId, role: user.role };
      },
    }),
  ],
  callbacks: {
    // `user` is only present on the initial sign-in call, so this is where
    // authorize()'s return value (typed via src/types/next-auth.d.ts) gets
    // copied onto the long-lived JWT.
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.pressId = user.pressId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.userId;
      session.pressId = token.pressId;
      session.role = token.role;
      return session;
    },
  },
};
