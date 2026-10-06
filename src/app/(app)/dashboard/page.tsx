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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight md:text-[28px]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted">
            The morning view — answered from stored data, never invented.
          </p>
        </div>
        <a
          href="/export"
          className="rounded-control border border-border px-3 py-2 text-sm font-medium hover:bg-page"
        >
          Download full export
        </a>
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
          <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4 border-y border-border py-5">
            <div>
              <div className="label">Outstanding payments</div>
              <div className="mt-1 text-[30px] font-semibold tracking-tight text-ink">
                {inr(res.data.paymentsOutstanding)}
              </div>
            </div>
            <div className="flex flex-1 flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <span>
                <b className="font-semibold text-ink">
                  {res.data.openRequirements}
                </b>{" "}
                open requirements
              </span>
              <span>
                <b className="font-semibold text-ink">
                  {res.data.openOrders.length}
                </b>{" "}
                open orders
              </span>
              <span
                className={
                  res.data.quotesAwaitingResponse.length > 0 ? "text-warning" : ""
                }
              >
                <b className="font-semibold">
                  {res.data.quotesAwaitingResponse.length}
                </b>{" "}
                quotes awaiting a response
              </span>
              <span>
                <b className="font-semibold text-ink">{res.data.wonThisMonth}</b>{" "}
                won this month
              </span>
              <span className={res.data.lostThisMonth > 0 ? "text-danger" : ""}>
                <b className="font-semibold">{res.data.lostThisMonth}</b> lost
                this month
              </span>
              <span className={res.data.oemResponsesPending > 0 ? "text-warning" : ""}>
                <b className="font-semibold">
                  {res.data.oemResponsesPending}
                </b>{" "}
                OEM responses pending
              </span>
              <span className={res.data.ordersAtRisk.length > 0 ? "text-danger" : ""}>
                <b className="font-semibold">{res.data.ordersAtRisk.length}</b>{" "}
                orders at risk
              </span>
              <span
                className={res.data.documentsExpiring.length > 0 ? "text-warning" : ""}
              >
                <b className="font-semibold">
                  {res.data.documentsExpiring.length}
                </b>{" "}
                documents expiring
              </span>
            </div>
          </div>

          <section className="rounded-card border border-border bg-surface">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold">
              Quotes awaiting a response
            </div>
            {res.data.quotesAwaitingResponse.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">None.</p>
            ) : (
              <ul className="divide-y divide-border">
                {res.data.quotesAwaitingResponse.map((q) => (
                  <li key={q.id}>
                    <Link
                      href={`/requirements/${q.id}`}
                      className="flex items-center justify-between px-4 py-3 text-sm hover:bg-page/60"
                    >
                      <span className="font-mono text-[13px] font-medium">
                        {q.tender_ref}
                      </span>
                      <span className="text-muted">{q.customer}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-card border border-border bg-surface">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold">
              Open orders &amp; state
            </div>
            {res.data.openOrders.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">None.</p>
            ) : (
              <ul className="divide-y divide-border">
                {res.data.openOrders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/orders/${o.id}`}
                      className="flex items-center justify-between px-4 py-3 text-sm hover:bg-page/60"
                    >
                      <span className="font-mono text-[13px] font-medium">
                        {o.po_number}
                      </span>
                      <span className="text-muted">{o.stage}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

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
