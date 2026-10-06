import Link from "next/link";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

const nav: { label: string; href: string | null }[] = [
  { label: "Requirements", href: "/" },
  { label: "OEMs", href: "/oems" },
  { label: "Quotations", href: "/quotations" },
  { label: "Orders", href: "/orders" },
  { label: "Fulfilment", href: "/fulfilment" },
  { label: "Payments", href: "/payments" },
  { label: "Documents", href: "/documents" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Audit", href: "/audit" },
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
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
          <span className="h-4 w-1 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-semibold tracking-tight">
              Defence Contract CRM
            </div>
            <div className="truncate text-[11px] text-muted">
              Requirements · OEMs · POs
            </div>
          </div>
        </div>

        <div className="px-4 pb-1 pt-5">
          <span className="label">Work</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {nav.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center border-l-2 py-2 pl-[10px] pr-3 text-sm ${
                  item.label === "Requirements"
                    ? "border-primary font-medium text-ink"
                    : "border-transparent text-muted hover:border-border hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                className="flex cursor-default items-center justify-between border-l-2 border-transparent py-2 pl-[10px] pr-3 text-sm text-muted/50"
              >
                {item.label}
                <span className="text-[10px] uppercase tracking-wide">soon</span>
              </span>
            ),
          )}
        </nav>
        <div className="border-t border-border px-4 py-3 text-[11px] text-muted">
          {user?.email ?? "unknown"}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
          <span className="h-4 w-1 shrink-0 rounded-full bg-primary md:hidden" />
          <form
            action="/search"
            method="get"
            className="hidden min-w-0 flex-1 items-center gap-2 border-b border-border pb-1 sm:flex"
          >
            <svg
              viewBox="0 0 16 16"
              className="size-4 shrink-0 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="m10.5 10.5 3 3" />
            </svg>
            <input
              name="q"
              placeholder="Search tender ref, customer, OEM, PO…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
            <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted lg:inline-block">
              ⌘K
            </kbd>
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
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
