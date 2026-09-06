import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Module augmentation so `user`/`token`/`session` carry our custom
 * pressId/role fields with real types end-to-end (authorize() ->
 * jwt callback -> session callback, see auth-options.ts) instead of
 * casting through `unknown` at every read site.
 */
declare module "next-auth" {
  interface User {
    pressId: string;
    role: UserRole;
  }

  interface Session {
    pressId?: string;
    role?: UserRole;
    user?: DefaultSession["user"] & { id?: string };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    pressId?: string;
    role?: UserRole;
  }
}
