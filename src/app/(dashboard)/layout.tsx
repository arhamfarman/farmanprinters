import Link from "next/link";
import {
  LayoutGrid,
  FileText,
  Receipt,
  Truck,
  Users,
  Network,
  Settings,
} from "lucide-react";

const NAV = [
  { href: "/dashboard/orders", label: "Orders", icon: LayoutGrid },
  { href: "/dashboard/quotations", label: "Quotations", icon: FileText },
  { href: "/dashboard/invoices", label: "Invoices", icon: Receipt },
  { href: "/dashboard/challans", label: "Challans", icon: Truck },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/network", label: "Network", icon: Network },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

/**
 * Staff-only chrome (RBAC enforced by middleware.ts before any request
 * reaches here) — one fixed sidebar covers the whole internal app, per
 * ARCHITECTURE.md's "one dashboard route group instead of permission
 * checks sprinkled across pages" decision.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-muted/20 p-3">
        <div className="mb-4 px-2 text-sm font-semibold">Farman Printing Press</div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
