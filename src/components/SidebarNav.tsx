"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { label: string; href: string; icon: keyof typeof ICONS };
type Group = { label: string; items: Item[] };

const GROUPS: Group[] = [
  {
    label: "Workspace",
    items: [{ label: "Dashboard", href: "/dashboard", icon: "grid" }],
  },
  {
    label: "Sales",
    items: [
      { label: "Requirements", href: "/", icon: "file" },
      { label: "OEMs", href: "/oems", icon: "factory" },
      { label: "Customers", href: "/customers", icon: "users" },
      { label: "Quotations", href: "/quotations", icon: "quote" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Orders", href: "/orders", icon: "box" },
      { label: "Fulfilment", href: "/fulfilment", icon: "truck" },
      { label: "Payments", href: "/payments", icon: "coins" },
    ],
  },
  {
    label: "Library",
    items: [
      { label: "Documents", href: "/documents", icon: "folder" },
      { label: "Approvals", href: "/approvals", icon: "shield" },
    ],
  },
  {
    label: "Intelligence",
    items: [{ label: "Analytics", href: "/analytics", icon: "chart" }],
  },
  {
    label: "Utility",
    items: [
      { label: "Audit", href: "/audit", icon: "list" },
      { label: "Settings", href: "/settings", icon: "gear" },
    ],
  },
];

const ICONS = {
  grid: <path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" />,
  file: <path d="M4 1.5h5l3 3v10H4zM9 1.5v3h3" />,
  factory: <path d="M2 14V6l4 2V6l4 2V4h4v10zM2 14h12" />,
  quote: <path d="M3 3h10v10H3zM5.5 6.5h5M5.5 9h5M5.5 11.5h3" />,
  box: <path d="M8 1.5 14 4.5 8 7.5 2 4.5zM2 4.5v7L8 14.5l6-3v-7M8 7.5v7" />,
  truck: (
    <path d="M1.5 3.5h8v7h-8zM9.5 6.5h3l2 2v2h-5M3.5 12.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0M10.5 12.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0" />
  ),
  coins: <path d="M8 5.5c3 0 5-.9 5-2s-2-2-5-2-5 .9-5 2 2 2 5 2zM3 3.5v9c0 1.1 2 2 5 2s5-.9 5-2v-9" />,
  folder: <path d="M1.5 3.5h4l1.5 2h8v8h-13.5z" />,
  search: <path d="M7 2a5 5 0 1 0 0 10A5 5 0 0 0 7 2zM10.5 10.5l3.5 3.5" />,
  list: <path d="M3 4h10M3 8h10M3 12h10" />,
  chart: <path d="M3 13V7M7 13V4M11 13V9M2 13.5h12" />,
  users: <path d="M5.5 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM1.5 13.5c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5M11 5.5a1.6 1.6 0 1 0 0-3.2M11 8.5c2 .2 3.5 1.6 3.5 3.4" />,
  shield: <path d="M8 1.5 13 3.5v4c0 3-2.1 5.4-5 6.5-2.9-1.1-5-3.5-5-6.5v-4z" />,
  gear: (
    <path d="M8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 1.5l1 1.6 1.9-.3.4 1.8 1.7.8-.8 1.7.8 1.7-1.7.8-.4 1.8-1.9-.3-1 1.6-1-1.6-1.9.3-.4-1.8-1.7-.8.8-1.7-.8-1.7 1.7-.8.4-1.8 1.9.3z" />
  ),
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {GROUPS.map((group) => (
        <div key={group.label} className="mb-4">
          <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-nav-muted">
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/" || pathname.startsWith("/requirements")
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2.5 border-l-2 py-1.5 pl-2 pr-2 text-sm transition-colors ${
                    active
                      ? "border-primary bg-white/[0.06] font-medium text-white"
                      : "border-transparent text-nav-muted hover:bg-white/[0.04] hover:text-nav-ink"
                  }`}
                >
                  <Icon name={item.icon} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
