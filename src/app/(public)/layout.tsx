import Link from "next/link";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalog" },
  { href: "/inquiry", label: "Request a Quote" },
];

/**
 * No auth/session JS on this route group at all (see ARCHITECTURE.md's
 * three-route-group rationale) — a marketing header/footer, nothing that
 * imports NextAuth or React Query.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <Link href="/" className="font-semibold">Farman Printing Press</Link>
          <nav className="flex gap-4 text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-foreground/80 hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
      <footer className="border-t border-border p-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Farman Printing Press
      </footer>
    </div>
  );
}
