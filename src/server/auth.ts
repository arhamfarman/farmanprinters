import { getServerSession } from "next-auth";
import type { UserRole } from "@prisma/client";
import { authOptions } from "@/server/auth-options";

/**
 * Every signed-in user — staff and client-portal alike — reads through
 * this one shape, because CLIENT is a `role` on the same User table
 * (see schema.prisma), not a separate login system. `clientId` is only
 * ever set when `role === "CLIENT"`; every other role gets it as null.
 */
export type Session = {
  userId: string;
  pressId: string;
  role: UserRole;
  clientId: string | null;
};

export class UnauthorizedError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Adapts NextAuth's session shape (see auth-options.ts's jwt/session callbacks) to the Session type above. */
export async function getSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.pressId || !session.role) return null;

  return {
    userId: session.user.id,
    pressId: session.pressId,
    role: session.role,
    clientId: session.clientId ?? null,
  };
}

/**
 * Guard used at the top of every staff-facing server action / route
 * handler that mutates data. Keeping this in one place means "who can
 * void an invoice" is answered by grepping this file, not by re-reading
 * every action. CLIENT is never in an `allowed` list here, so a portal
 * session is rejected the same way a signed-out request is.
 */
export function requireRole(session: Session | null, allowed: UserRole[]): Session {
  if (!session) throw new UnauthorizedError();
  if (!allowed.includes(session.role)) {
    throw new UnauthorizedError(`Role ${session.role} cannot perform this action`);
  }
  return session;
}

export const ALL_STAFF: UserRole[] = ["ADMIN", "DESIGNER", "PRODUCTION", "ACCOUNTANT"];
export const FINANCE_ROLES: UserRole[] = ["ADMIN", "ACCOUNTANT"];

/**
 * Portal-side counterpart to requireRole() — every (portal) route group
 * server action (portal-actions.ts) calls this instead, so a CLIENT
 * session's queries are always scoped to its own clientId and a staff
 * session can never wander into portal-only reads by accident.
 */
export function requireClientSession(session: Session | null): Session & { clientId: string } {
  if (!session || session.role !== "CLIENT" || !session.clientId) {
    throw new UnauthorizedError();
  }
  return session as Session & { clientId: string };
}
