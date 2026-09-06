import Link from "next/link";

const NAV = [
  { href: "/client/orders", label: "My Orders" },
  { href: "/client/ledger", label: "My Ledger" },
];

/**
 * Client-scoped chrome — a portal user only ever sees their own
 * orders/ledger, never another client's or the staff nav (see
 * middleware.ts's /client/:path* gate). Kept as its own layout rather
 * than the dashboard's with permission checks, per ARCHITECTURE.md.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
          <span className="font-semibold">Farman Printing Press — Client Portal</span>
          <nav className="flex gap-4 text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-foreground/80 hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 p-4">{children}</main>
    </div>
  );
}
