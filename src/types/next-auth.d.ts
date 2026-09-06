import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Module augmentation so `user`/`token`/`session` carry our custom
 * pressId/role/clientId fields with real types end-to-end (authorize() /
 * the PrismaAdapter's user row -> jwt callback -> session callback, see
 * auth-options.ts) instead of casting through `unknown` at every read
 * site. `User` here is also what `AdapterUser` extends, so the Email
 * provider's adapter-fetched user gets these fields typed too — they're
 * real columns on our User model (schema.prisma), just not ones the base
 * next-auth `User` interface knows about.
 */
declare module "next-auth" {
  interface User {
    pressId: string;
    role: UserRole;
    clientId: string | null;
  }

  interface Session {
    pressId?: string;
    role?: UserRole;
    clientId?: string | null;
    user?: DefaultSession["user"] & { id?: string };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    pressId?: string;
    role?: UserRole;
    clientId?: string | null;
  }
}
