"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Client-portal-branded entry point for the Email (magic-link) provider —
 * a friendlier alternative to NextAuth's generic /api/auth/signin page,
 * which lists every provider (Staff Login included) and isn't a page a
 * press would hand an NGO/corporate client a link to.
 *
 * Deliberately shows the same "check your email" message whether or not
 * the address actually has portal access (see auth-options.ts: an
 * un-provisioned email's request fails server-side, by design), so this
 * form can't be used to probe which emails have a login — a staff member
 * telling a client "I've set up your access" is the real confirmation.
 */
export default function MagicLinkPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    await signIn("email", { email, redirect: false, callbackUrl: "/client/dashboard" });
    // Intentionally ignore the result's success/error distinction in the
    // UI — see the file-level comment above.
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-lg font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          If {email} has client portal access, a sign-in link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Client Portal Sign In</h1>
        <p className="text-sm text-muted-foreground">Enter your email and we&apos;ll send you a sign-in link.</p>
      </div>
      <label className="text-sm">
        Email
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      </label>
      <Button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send Sign-In Link"}
      </Button>
    </form>
  );
}
