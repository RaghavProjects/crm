import Link from "next/link";
import { getDashboard, type ActivityItem } from "@/lib/dashboard";
import { getSessionUser } from "@/lib/supabase/server";
import { inrCompact, plural } from "@/lib/format";
import { HEALTH_RANK, type Health } from "@/lib/health";
import { StatusPill } from "@/components/ui";

function stamp() {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date())
    .toUpperCase();
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, y)) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(d);
}

function timeLabel(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function DashboardPage() {
  const res = await getDashboard();

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-[1440px]">
        <div className="panel border-danger/30 bg-critical-tint p-3 text-sm text-danger">
          The dashboard couldn&apos;t be loaded. Your other CRM data is still
          available. {res.error}
        </div>
      </div>
    );
  }

  const d = res.data;
  const user = await getSessionUser();
  const overdue = d.openOrders.filter((o) => o.health === "overdue");
  const atRisk = d.openOrders.filter((o) => o.health === "at_risk");
  const riskOrders = [...overdue, ...atRisk].sort((a, b) => b.value - a.value);
  const exposure = riskOrders.reduce((s, o) => s + o.value, 0);

  const missingOem = d.openOrders.filter((o) => o.missingOem).length;
  const missingDate = d.openOrders.filter((o) => o.missingDate).length;
  const missingValue = d.openOrders.filter((o) => o.missingValue).length;
  const dqTotal = d.openOrders.filter(
    (o) => o.missingOem || o.missingDate || o.missingValue,
  ).length;

  const priority = [...d.openOrders]
    .sort(
      (a, b) =>
        HEALTH_RANK[a.health as Health] - HEALTH_RANK[b.health as Health] ||
        b.value - a.value,
    )
    .slice(0, 3);

  const activityGroups: { label: string; items: ActivityItem[] }[] = [];
  for (const a of user ? d.recentActivity : []) {
    const label = dayLabel(a.at);
    const g = activityGroups.find((x) => x.label === label);
    if (g) g.items.push(a);
    else activityGroups.push({ label, items: [a] });
  }

  const supporting =
    riskOrders.length > 0
      ? `${plural(riskOrders.length, "order")} need your attention today. ${inrCompact(exposure)} of active order value is exposed.`
      : `No orders need attention today. ${inrCompact(d.kpis.activeOrderValue)} of active order value is tracked.`;

  return (
    <div className="mx-auto max-w-[1440px] space-y-7">
      {/* Command header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="label">Contract command center</span>
          <h1 className="mt-1 text-[30px] font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">{supporting}</p>
        </div>
        <span className="font-mono text-xs text-muted">{stamp()}</span>
      </div>

      {/* Business pulse */}
      <section className="panel p-5">
        <div className="label">Business pulse</div>
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              value: inrCompact(d.kpis.activeOrderValue),
              label: "Active order value",
              context: plural(d.openOrders.length, "order"),
            },
            {
              value: String(d.openOrders.length),
              label: "Active orders",
              context: `${d.contractFlow[2]?.count ?? 0} ordered`,
            },
            {
              value: inrCompact(exposure),
              label: "Value at risk",
              context:
                riskOrders.length > 0
                  ? plural(riskOrders.length, "order")
                  : "none",
              tone: exposure > 0 ? "text-danger" : "",
            },
            {
              value: inrCompact(d.paymentsOutstanding),
              label: "Receivable",
              context:
                d.payments.overdueCount > 0
                  ? plural(d.payments.overdueCount, "overdue invoice")
                  : "all clear",
              tone: d.payments.overdueCount > 0 ? "text-danger" : "",
            },
          ].map((m) => (
            <div key={m.label}>
              <div className={`text-[30px] font-semibold tracking-tight ${m.tone || "text-ink"}`}>
                {m.value}
              </div>
              <div className="mt-1 text-[13px] font-medium text-ink">{m.label}</div>
              <div className="text-xs text-muted">{m.context}</div>
            </div>
          ))}
        </div>

        {/* Journey summary line */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {d.contractFlow.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <Link
                href={s.href}
                className="rounded-control border border-border bg-forest-tint px-3 py-1.5 hover:border-primary/40"
              >
                <div className="text-[11px] text-muted">{s.label}</div>
                <div className="text-base font-semibold tabular-nums">{s.count}</div>
              </Link>
              {i < d.contractFlow.length - 1 && (
                <span aria-hidden className="text-muted">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Journey / Risk */}
      <div className="grid gap-5 lg:grid-cols-[58%_42%]">
        <section className="panel p-5">
          <div className="label">Contract journey</div>
          <p className="mt-2 text-sm text-muted">
            Requirement → Quotation → Order → Fulfilment → Payment.
          </p>
          <div className="mt-5 space-y-2.5">
            {d.contractFlow.map((s) => {
              const max = Math.max(1, ...d.contractFlow.map((x) => x.count));
              return (
                <Link
                  key={s.label}
                  href={s.href}
                  className="flex items-center gap-3 text-sm hover:text-primary"
                >
                  <span className="w-24 shrink-0 text-muted">{s.label}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-page">
                    <span
                      className="block h-full rounded-full bg-primary/70"
                      style={{ width: `${Math.round((s.count / max) * 100)}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right font-semibold tabular-nums">
                    {s.count}
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted">
            OEM is a related entity, not a lifecycle stage.
          </p>
        </section>

        <section className="panel p-5">
          <div className="label">Risk center</div>
          {riskOrders.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No delivery risk detected.</p>
          ) : (
            <>
              <p className="mt-2 text-sm font-medium">
                {plural(riskOrders.length, "order")} require intervention ·{" "}
                <span className="text-danger">{inrCompact(exposure)} exposed</span>
              </p>
              <ul className="mt-3 divide-y divide-border">
                {riskOrders.slice(0, 3).map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/orders/${o.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary"
                    >
                      <span className="font-mono text-[13px] font-medium">
                        {o.po_number}
                      </span>
                      <span className="w-24 text-right font-mono text-[13px]">
                        {o.missingValue ? "—" : inrCompact(o.value)}
                      </span>
                      <span className="w-40 text-right text-xs text-muted">
                        {o.healthReason}
                      </span>
                      <span className="w-20 text-right text-xs font-medium text-danger">
                        {o.health === "overdue" ? "Critical" : "At risk"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/orders"
                className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
              >
                Open risk workspace →
              </Link>
            </>
          )}

          <div className="mt-4 border-t border-border pt-3">
            <div className="label">Data quality</div>
            {dqTotal === 0 ? (
              <p className="mt-1 text-sm text-muted">All order records complete.</p>
            ) : (
              <p className="mt-1 text-sm text-muted">
                {plural(dqTotal, "record")} need information ·{" "}
                {[
                  missingOem ? `${missingOem} missing OEM` : "",
                  missingDate ? `${missingDate} missing delivery date` : "",
                  missingValue ? `${missingValue} missing value` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Priority orders */}
      <section className="panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="label">Priority orders</div>
          <Link href="/orders" className="text-xs font-medium text-primary hover:underline">
            View all →
          </Link>
        </div>
        {priority.length === 0 ? (
          <p className="text-sm text-muted">No active orders.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="label py-2 font-medium">Order</th>
                <th className="label py-2 text-right font-medium">Value</th>
                <th className="label py-2 font-medium">Issue</th>
                <th className="label py-2 font-medium">Health</th>
                <th className="label py-2" />
              </tr>
            </thead>
            <tbody>
              {priority.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="py-3">
                    <Link href={`/orders/${o.id}`} className="font-mono text-[13px] font-medium hover:text-primary">
                      {o.po_number}
                    </Link>
                  </td>
                  <td className="py-3 text-right font-mono text-[13px]">
                    {o.missingValue ? "—" : inrCompact(o.value)}
                  </td>
                  <td className="py-3 text-muted">{o.healthReason}</td>
                  <td className="py-3">
                    <StatusPill kind={o.health} />
                  </td>
                  <td className="py-3 text-right">
                    <Link href={`/orders/${o.id}`} aria-label={`Open ${o.po_number}`} className="text-muted hover:text-primary">
                      →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Activity / Quick actions */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel p-5">
          <div className="label mb-3">Recent activity</div>
          {!user ? (
            <p className="text-sm text-muted">Sign in to view activity.</p>
          ) : activityGroups.length === 0 ? (
            <p className="text-sm text-muted">No recent activity.</p>
          ) : (
            <div className="space-y-4">
              {activityGroups.map((g) => (
                <div key={g.label}>
                  <div className="mb-1 text-xs font-medium text-muted">{g.label}</div>
                  <ul className="space-y-1.5">
                    {g.items.map((a, i) => (
                      <li key={i} className="text-sm">
                        {a.message}
                        {a.actor ? (
                          <span className="text-muted">
                            {" "}
                            · {a.actor.split("@")[0]} · {timeLabel(a.at)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel p-5">
          <div className="label mb-3">Quick actions</div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "+ Requirement", href: "/requirements/new" },
              { label: "+ Quotation", href: "/quotations" },
              { label: "+ Order", href: "/orders" },
              { label: "Upload Document", href: "/documents" },
            ].map((a) => (
              <Link
                key={a.label}
                href={a.href}
                data-guest-block
                className="rounded-control border border-border px-3 py-1.5 text-sm font-medium hover:bg-page"
              >
                {a.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
