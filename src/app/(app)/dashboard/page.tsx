import Link from "next/link";
import { getDashboard } from "@/lib/dashboard";
import { askQuestion } from "@/lib/ask";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const res = await getDashboard();
  const asked = sp.q?.trim() ? await askQuestion(sp.q) : null;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight md:text-[28px]">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted">
          The morning view — answered from stored data, never invented.
        </p>
      </div>

      <section className="rounded-card border border-border bg-surface p-4">
        <form action="/dashboard" method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder='Ask: "how many open orders", "what did we lose this month", "outstanding payments"…'
            className="w-full rounded-control border border-border bg-page px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Ask
          </button>
        </form>

        {asked && (
          <div className="mt-3 rounded-card border border-border bg-page/60 p-3">
            {asked.answered ? (
              <>
                <p className="text-sm font-medium">{asked.answer}</p>
                {asked.rows.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-muted">
                    {asked.rows.map((r, i) => (
                      <li key={i}>
                        {r.href ? (
                          <Link href={r.href} className="hover:text-primary">
                            {r.label}
                          </Link>
                        ) : (
                          r.label
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-sm text-[#b45309]">{asked.message}</p>
            )}
          </div>
        )}
      </section>

      {!res.ok && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-[#b91c1c]">
          Could not load the dashboard: {res.error}
        </div>
      )}

      {res.ok && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Open requirements", value: res.data.openRequirements },
              { label: "Open orders", value: res.data.openOrders },
              { label: "Won this month", value: res.data.wonThisMonth },
              { label: "Lost this month", value: res.data.lostThisMonth },
              {
                label: "Outstanding payments",
                value: inr(res.data.paymentsOutstanding),
              },
              {
                label: "OEM responses pending",
                value: res.data.oemResponsesPending,
              },
              {
                label: "Orders at risk",
                value: res.data.ordersAtRisk.length,
                danger: res.data.ordersAtRisk.length > 0,
              },
              {
                label: "Documents expiring",
                value: res.data.documentsExpiring.length,
                danger: res.data.documentsExpiring.length > 0,
              },
            ].map((t) => (
              <div
                key={t.label}
                className="rounded-card border border-border bg-surface p-4"
              >
                <div className="text-xs text-muted">{t.label}</div>
                <div
                  className={`mt-1 text-xl font-semibold ${
                    "danger" in t && t.danger ? "text-danger" : "text-ink"
                  }`}
                >
                  {t.value}
                </div>
              </div>
            ))}
          </div>

          <section className="rounded-card border border-border bg-surface">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold">
              Orders at delivery risk
            </div>
            {res.data.ordersAtRisk.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">None.</p>
            ) : (
              <ul className="divide-y divide-border">
                {res.data.ordersAtRisk.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/orders/${o.id}`}
                      className="flex items-center justify-between px-4 py-3 text-sm hover:bg-page/60"
                    >
                      <span className="font-medium">PO {o.po_number}</span>
                      <span className="text-danger tabular-nums">
                        due {o.deadline}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-card border border-border bg-surface">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold">
              Documents expiring (90 days)
            </div>
            {res.data.documentsExpiring.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">None.</p>
            ) : (
              <ul className="divide-y divide-border">
                {res.data.documentsExpiring.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <span>{d.title}</span>
                    <span className="text-muted tabular-nums">
                      expires {d.expiry_date}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
