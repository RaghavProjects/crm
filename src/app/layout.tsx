import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Defence Contract CRM",
  description: "Requirements, OEM sourcing, quotations and fulfilment",
};

const nav = [
  { label: "Home", href: "#" },
  { label: "Requirements", href: "/" },
  { label: "OEMs", href: "/oems" },
  { label: "Quotations", href: "#" },
  { label: "Orders", href: "#" },
  { label: "Fulfilment", href: "#" },
  { label: "Payments", href: "#" },
  { label: "Documents", href: "#" },
  { label: "Dashboard", href: "#" },
  { label: "Settings", href: "#" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-page text-ink font-sans antialiased">
        <div className="flex min-h-dvh">
          <aside className="hidden w-[248px] shrink-0 border-r border-border bg-surface md:flex md:flex-col">
            <div className="flex h-14 items-center gap-2 border-b border-border px-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-control bg-primary text-[11px] font-semibold text-white">
                DC
              </span>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-semibold">
                  Defence Contract CRM
                </div>
                <div className="truncate text-[11px] text-muted">
                  Requirements · OEMs · Orders
                </div>
              </div>
            </div>
            <nav className="flex-1 space-y-0.5 p-3">
              {nav.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center rounded-control px-3 py-2 text-sm ${
                    item.label === "Requirements"
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted hover:bg-page hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-border p-3 text-[11px] text-muted">
              Step 2 · Supabase-backed
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
              <span className="grid size-7 place-items-center rounded-control bg-primary text-[11px] font-semibold text-white md:hidden">
                DC
              </span>
              <div className="hidden min-w-0 flex-1 items-center rounded-control border border-border bg-page px-3 py-1.5 text-sm text-muted sm:flex">
                Search requirements, OEMs, POs…
              </div>
              <Link
                href="/requirements/new"
                className="ml-auto rounded-control bg-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                + New requirement
              </Link>
            </header>
            <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
