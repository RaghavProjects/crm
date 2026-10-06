import Link from "next/link";
import { getDashboard } from "@/lib/dashboard";
import { inrFull, inrCompact, plural } from "@/lib/format";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "sales", label: "Sales" },
  { key: "delivery", label: "Delivery" },
  { key: "oem", label: "OEM" },
  { key: "clients", label: "Clients" },
  { key: "finance", label: "Finance" },
];

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function Trend({ data }: { data: { month: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-36 items-end gap-3">
      {data.map((d) => (
        <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-primary/70"
            style={{ height: `${Math.round((d.value / max) * 100)}%`, minHeight: d.value > 0 ? 4 : 0 }}
            title={`${d.month}: ${inrFull(d.value)}`}
          />
          <span className="font-mono text-[10px] text-muted">{d.month.slice(2)}</span>
        </div>
      ))}
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "overview";
  const res = await getDashboard();

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-[1200px]">
        <div className="rounded-card border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          Analytics couldn&apos;t be loaded. {res.error}
        </div>
      </div>
    );
  }
  const d = res.data;

  const revenueTable = (rows: { name: string; value: number; orders: number }[]) => (
    <table className="w-full text-left text-sm">
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className="border-t border-border">
            <td className="py-2.5">{r.name}</td>
            <td className="py-2.5 text-right text-muted">{plural(r.orders, "order")}</td>
            <td className="py-2.5 text-right font-mono text-[13px]">{inrFull(r.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <span className="label">Intelligence</span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Sales, delivery, OEM, client and finance analysis.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/analytics?tab=${t.key}`}
            className={`rounded-control px-3 py-1.5 text-sm font-medium ${
              t.key === tab
                ? "bg-primary/10 text-primary"
                : "text-muted hover:bg-page hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Tender conversion" value={d.kpis.conversionPct == null ? "—" : `${d.kpis.conversionPct}%`} />
            <Metric label="Delivery adherence" value={d.kpis.deliveryAdherencePct == null ? "—" : `${d.kpis.deliveryAdherencePct}%`} />
            <Metric label="Avg quote turnaround" value={d.kpis.avgTurnaroundDays == null ? "—" : `${d.kpis.avgTurnaroundDays} d`} />
            <Metric label="Repeat clients" value={String(d.kpis.repeatClients)} />
            <Metric label="Commission receivable" value={inrCompact(d.commissionReceivable)} />
          </div>
          <section className="border-t border-border pt-5">
            <h2 className="mb-3 text-[15px] font-semibold tracking-tight">Monthly sales trend</h2>
            <Trend data={d.monthlyTrend} />
          </section>
        </div>
      )}

      {tab === "sales" && (
        <div className="space-y-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <Metric label="Pipeline value" value={inrCompact(d.kpis.pipelineValue)} />
            <Metric label="Active order value" value={inrCompact(d.kpis.activeOrderValue)} />
            <Metric label="At-risk value" value={inrCompact(d.kpis.atRiskValue)} />
          </div>
          <section className="border-t border-border pt-5">
            <h2 className="mb-3 text-[15px] font-semibold tracking-tight">Revenue by client</h2>
            {revenueTable(d.revenueByClient)}
          </section>
        </div>
      )}

      {tab === "delivery" && (
        <div className="grid gap-6 sm:grid-cols-3">
          <Metric label="Delivery adherence" value={d.kpis.deliveryAdherencePct == null ? "—" : `${d.kpis.deliveryAdherencePct}%`} />
          <Metric label="Open orders at risk" value={String(d.ordersAtRisk.length)} />
          <Metric label="Open orders" value={String(d.openOrders.length)} />
        </div>
      )}

      {tab === "oem" && (
        <section className="border-t border-border pt-5">
          <h2 className="mb-3 text-[15px] font-semibold tracking-tight">Revenue by OEM</h2>
          {d.revenueByOem.length === 0 ? <p className="text-sm text-muted">None.</p> : revenueTable(d.revenueByOem)}
        </section>
      )}

      {tab === "clients" && (
        <section className="border-t border-border pt-5">
          <h2 className="mb-3 text-[15px] font-semibold tracking-tight">Revenue by client</h2>
          {d.revenueByClient.length === 0 ? <p className="text-sm text-muted">None.</p> : revenueTable(d.revenueByClient)}
        </section>
      )}

      {tab === "finance" && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Receivable" value={inrCompact(d.paymentsOutstanding)} />
          <Metric label="Pending" value={inrCompact(d.payments.pendingAmount)} />
          <Metric label="Overdue" value={inrCompact(d.payments.overdueAmount)} />
          <Metric label="Commission receivable" value={inrCompact(d.commissionReceivable)} />
        </div>
      )}
    </div>
  );
}
