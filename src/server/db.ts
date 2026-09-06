import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton so hot-reload doesn't spawn a new
// Prisma Client (and a new connection pool) on every file save.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

/**
 * Every business table is press-scoped. Call sites for list/detail queries
 * should always pass `pressId` explicitly (from the session) rather than
 * trusting a client-supplied id — this helper just documents/enforces the
 * shape so it's obvious at the call site when that's been forgotten.
 */
export function withPressScope<T extends { pressId?: string }>(
  pressId: string,
  where: T,
): T & { pressId: string } {
  return { ...where, pressId };
}
