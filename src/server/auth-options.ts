import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { db } from "@/server/db";

const adapter = PrismaAdapter(db);

/**
 * NextAuth's default Email-provider behavior auto-creates a User on the
 * first magic-link request for any address — fine for a consumer app,
 * wrong for a multi-tenant B2B ERP where a portal login must be tied to
 * one specific Client business record (User.clientId) that only staff can
 * set up. Overriding createUser to always throw means an un-provisioned
 * email never gets a link sent (see the request-magic-link route calling
 * getUserByEmail -> createUser before anything else runs) — a client can
 * only sign in after a staff member grants portal access
 * (server/actions/client-actions.ts's grantClientPortalAccess), which
 * creates the User row (role=CLIENT, clientId set, no passwordHash)
 * ahead of time.
 */
adapter.createUser = async () => {
  throw new Error("Self-registration is disabled. Ask your press contact to set up your portal login.");
};

export const authOptions: AuthOptions = {
  adapter,
  session: { strategy: "jwt" },
  pages: { signIn: "/api/auth/signin" },
  // NOTE on multi-environment hosting (Netlify production + per-branch +
  // per-PR deploy previews): next-auth v4 has no "trust any host" option
  // (that's a v5/Auth.js-only field — adding it here doesn't compile
  // against v4's AuthOptions type, which is why it's not here) — it reads
  // NEXTAUTH_URL directly. Set NEXTAUTH_URL per Netlify deploy context
  // (Site settings -> Environment variables -> scope by context) so
  // Production gets the real domain; ephemeral PR deploy-preview URLs
  // can't be predicted ahead of time, so sign-in on those specifically is
  // a known rough edge unless NEXTAUTH_URL is overridden for that branch.
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
        // passwordHash is null for CLIENT-role (magic-link-only) users —
        // this provider is staff-only, so treat that the same as "no such user".
        if (!user || !user.isActive || !user.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          pressId: user.pressId,
          role: user.role,
          clientId: user.clientId,
        };
      },
    }),
    // Client portal sign-in. `sendVerificationRequest` is overridden
    // instead of relying on the provider's default (which needs a working
    // `server`) so local dev works with zero SMTP setup: no EMAIL_SERVER
    // configured -> the link is printed to the server console instead of
    // emailed. Set a real EMAIL_SERVER (see .env.example) to actually send.
    EmailProvider({
      from: process.env.EMAIL_FROM ?? "Farman Printing Press <no-reply@farmanpress.com>",
      async sendVerificationRequest({ identifier, url, provider }) {
        if (!process.env.EMAIL_SERVER) {
          console.log(`\n[magic-link] No EMAIL_SERVER configured — sign-in link for ${identifier}:\n  ${url}\n`);
          return;
        }
        const transport = nodemailer.createTransport(process.env.EMAIL_SERVER);
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: `Sign in to your ${new URL(url).host} client portal`,
          text: `Sign in to your FarmanPrinters client portal:\n${url}`,
          html: `<p>Sign in to your FarmanPrinters client portal:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    }),
  ],
  callbacks: {
    // Belt-and-suspenders alongside the createUser override above: even if
    // a row exists, only an active CLIENT account may complete an Email-
    // provider sign-in — a staff account should never authenticate via
    // magic link, and a deactivated portal user should never get back in.
    async signIn({ user, account }) {
      if (account?.provider !== "email") return true;
      return user.role === "CLIENT" && user.pressId != null;
    },
    // `user` is only present on the initial sign-in call, so this is where
    // authorize()'s / the Adapter's user row (typed via
    // src/types/next-auth.d.ts) gets copied onto the long-lived JWT.
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.pressId = user.pressId;
        token.role = user.role;
        token.clientId = user.clientId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.userId;
      session.pressId = token.pressId;
      session.role = token.role;
      session.clientId = token.clientId ?? null;
      return session;
    },
  },
};
