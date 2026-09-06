import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { UserRole } from "@prisma/client";

// Coarse RBAC gate for /dashboard/* and /client/*: matches
// src/server/auth.ts's single Session shape — CLIENT is a role like any
// other now (see schema.prisma's User.role), so both branches below check
// `token.role` explicitly rather than inferring staff-vs-portal from which
// fields happen to be present. Fine-grained checks (who can void an
// invoice, who can edit someone else's designer assignment) stay in the
// server actions via requireRole()/requireClientSession(), not here — this
// layer only answers "can this session even reach this route group at all".
const FINANCE_ONLY_PREFIXES = ["/dashboard/clients"];
const FINANCE_ROLES: UserRole[] = ["ADMIN", "ACCOUNTANT"];
const STAFF_ROLES: UserRole[] = ["ADMIN", "DESIGNER", "PRODUCTION", "ACCOUNTANT"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (pathname.startsWith("/dashboard")) {
    if (!token?.role || !STAFF_ROLES.includes(token.role as UserRole)) {
      return redirectToSignIn(request);
    }
    const isFinanceRoute = FINANCE_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (isFinanceRoute && !FINANCE_ROLES.includes(token.role as UserRole)) {
      return NextResponse.redirect(new URL("/dashboard/orders", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/client")) {
    if (!token || token.role !== "CLIENT" || !token.clientId) {
      return redirectToSignIn(request);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

function redirectToSignIn(request: NextRequest) {
  const signInUrl = new URL("/api/auth/signin", request.url);
  signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/client/:path*"],
};
