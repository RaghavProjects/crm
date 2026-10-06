import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/SidebarNav";
import { TopBar } from "@/components/TopBar";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-[232px] shrink-0 flex-col bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-white/10 px-4">
          <span className="h-4 w-1 shrink-0 rounded-full bg-accent" />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-semibold tracking-tight text-white">
              Defence Contract CRM
            </div>
            <div className="truncate text-[11px] text-nav-muted">Tender desk</div>
          </div>
        </div>
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar email={user?.email ?? null} />
        <main className="min-w-0 flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}

