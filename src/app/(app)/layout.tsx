import Link from "next/link";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

const nav: { label: string; href: string | null }[] = [
  { label: "Requirements", href: "/" },
  { label: "OEMs", href: "/oems" },
  { label: "Orders", href: "/orders" },
  { label: "Documents", href: "/documents" },
  { label: "Audit", href: "/audit" },
  { label: "Quotations", href: null },
  { label: "Fulfilment", href: null },
  { label: "Payments", href: null },
  { label: "Dashboard", href: "/dashboard" },
];

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();

  return (
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
          {nav.map((item) =>
            item.href ? (
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
            ) : (
              <span
                key={item.label}
                className="flex cursor-default items-center justify-between rounded-control px-3 py-2 text-sm text-muted/50"
              >
                {item.label}
                <span className="text-[10px] uppercase tracking-wide">soon</span>
              </span>
            ),
          )}
        </nav>
        <div className="border-t border-border p-3 text-[11px] text-muted">
          Signed in as {user?.email ?? "unknown"}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
          <span className="grid size-7 place-items-center rounded-control bg-primary text-[11px] font-semibold text-white md:hidden">
            DC
          </span>
          <form
            action="/search"
            method="get"
            className="hidden min-w-0 flex-1 items-center rounded-control border border-border bg-page px-3 py-1 sm:flex"
          >
            <input
              name="q"
              placeholder="Search requirements, OEMs, POs…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/requirements/new"
              className="hidden rounded-control bg-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 sm:inline-block"
            >
              + New requirement
            </Link>
            <SignOutButton />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
