import { getServerSession } from "next-auth";
import type { UserRole } from "@prisma/client";
import { authOptions } from "@/server/auth-options";

/**
 * Shape of the session payload NextAuth issues (see auth-options.ts). Staff
 * sessions carry a role for RBAC; portal (client) sessions carry a clientId
 * instead and never get a role, so `requireRole` naturally rejects them.
 */
export type StaffSession = {
  kind: "staff";
  userId: string;
  pressId: string;
  role: UserRole;
};

export type ClientPortalSession = {
  kind: "client";
  clientId: string;
  pressId: string;
};

export type Session = StaffSession | ClientPortalSession;

export class UnauthorizedError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Adapts NextAuth's session shape (see auth-options.ts's jwt/session
 * callbacks) to the StaffSession/ClientPortalSession union every server
 * action and API route guards against via requireRole(). Staff sessions
 * carry a role; the client portal (still passwordless-TODO per
 * auth-options.ts) has no session type here yet — the `false` branch is
 * unreachable today but kept so ClientPortalSession stays a real,
 * type-checked case once that provider exists instead of quietly bit-rotting.
 */
export async function getSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const raw = session as typeof session & { pressId?: string; role?: UserRole };
  if (!raw.pressId || !raw.role) return null;

  return {
    kind: "staff",
    userId: (raw.user as { id?: string } | undefined)?.id ?? "",
    pressId: raw.pressId,
    role: raw.role,
  };
}

/**
 * Guard used at the top of every server action / route handler that
 * mutates data. Keeping this in one place means "who can void an invoice"
 * is answered by grepping this file, not by re-reading every action.
 */
export function requireRole(session: Session | null, allowed: UserRole[]): StaffSession {
  if (!session || session.kind !== "staff") {
    throw new UnauthorizedError();
  }
  if (!allowed.includes(session.role)) {
    throw new UnauthorizedError(`Role ${session.role} cannot perform this action`);
  }
  return session;
}

export const ALL_STAFF: UserRole[] = ["OWNER_ADMIN", "ACCOUNTANT", "GRAPHIC_DESIGNER", "PRODUCTION_STAFF", "SALES"];
export const FINANCE_ROLES: UserRole[] = ["OWNER_ADMIN", "ACCOUNTANT"];

/**
 * Portal-side counterpart to requireRole() — used by the (portal) route
 * group's server actions once a client-portal auth provider exists (see
 * auth-options.ts's TODO). Kept here now so those actions can be written
 * and typed correctly ahead of that provider, rather than guarding
 * ad hoc with `session?.kind === "client"` at each call site.
 */
export function requireClientSession(session: Session | null): ClientPortalSession {
  if (!session || session.kind !== "client") {
    throw new UnauthorizedError();
  }
  return session;
}
