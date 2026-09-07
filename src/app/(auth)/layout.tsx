/**
 * Minimal chrome for the auth route group — just enough to center a card.
 * Distinct from (public)'s marketing header/footer and (dashboard)'s
 * sidebar; this page has exactly one job (get someone signed in) and
 * nothing else competing for attention.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
