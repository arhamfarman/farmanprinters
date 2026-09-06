import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

// Root layout only wires up global CSS + the React Query provider — each
// route group ((public)/(portal)/(dashboard)) supplies its own nav/session
// chrome in its own layout.tsx, per the audience split in ARCHITECTURE.md.
export const metadata: Metadata = {
  title: "Farman Printing Press",
  description: "Client portal, public showcase, and internal job/ledger ERP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
