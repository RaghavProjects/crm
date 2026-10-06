import Link from "next/link";
import { getOrder } from "@/lib/orders";
import { listFulfilment } from "@/lib/fulfilment";
import { listPayments, listCommission } from "@/lib/payments";
import { listOemOptions } from "@/lib/oems";
import { evaluateHealth } from "@/lib/health";
import { Lifecycle, StatusPill } from "@/components/ui";
import {
  updateStepAction,
  addPdiAction,
  addDeliveryAction,
  addOrderInvoiceAction,
  addPaymentAction,
  createCommissionAction,
  setCommissionStatusAction,
} from "./actions";

const input =
  "w-full rounded-control border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary";

const pdiStyle: Record<string, string> = {
  pending: "bg-border/60 text-muted",
  passed: "bg-success/15 text-success",
  failed: "bg-danger/15 text-danger",
  held: "bg-warning/15 text-warning",
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${d}T00:00:00Z`));
}
function num(n: number | null) {
  return n == null ? "—" : new Intl.NumberFormat("en-IN").format(n);
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const res = await getOrder(id);

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/" className="text-xs text-muted hover:text-ink">
          ← Requirements
        </Link>
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Could not load order: {res.error}
        </div>
      </div>
    );
  }

  const o = res.data;
  const ful = await listFulfilment(id);
  const payments = await listPayments(id);
  const commission = await listCommission(id);
  const oemOptions = await listOemOptions();
  const f = ful.ok ? ful.data : null;

  const paidByInvoice = new Map<string, number>();
  for (const p of payments.ok ? payments.rows : []) {
    if (p.invoice_id) {
      paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + p.amount);
    }
  }
  const delivered = f?.deliveredQty ?? 0;
  const outstanding = Math.max(0, o.ordered_qty - delivered);
  const latestPdi = f?.pdi[0] ?? null;
  const deliveredStep = f?.steps.find((s) => s.step === "delivered");
  const atRisk =
    !!o.delivery_deadline &&
    !!deliveredStep?.expected_date &&
    deliveredStep.expected_date > o.delivery_deadline;

  const deliveredStepRow = f?.steps.find((s) => s.step === "delivered");
  const complete = (f?.deliveredQty ?? 0) > 0;
  const evaluation = evaluateHealth({
    delivery: o.delivery_deadline,
    deliveredOn: deliveredStepRow?.completed_on ?? null,
    complete,
  });
  const nextStep = f?.steps.find((s) => !s.completed_on);
  const nextAction = complete
    ? "Request payment"
    : nextStep
      ? nextStep.label
      : "Confirm details";

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div className="text-xs text-muted">
        <Link href="/orders" className="hover:text-ink">Orders</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{o.po_number}</span>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-semibold tracking-tight">
            PO {o.po_number}
          </h1>
          {o.pdi_required && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
              PDI required
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          <Link href={`/requirements/${o.requirement_id}`} className="hover:text-ink">
            {o.tender_ref}
          </Link>{" "}
          · {o.customer}
          {o.oem_name ? ` · OEM ${o.oem_name}` : ""}
          {o.supplier_po ? ` · supplier PO ${o.supplier_po}` : ""}
        </p>
        <p className="mt-1 text-sm text-muted">
          PO date {fmt(o.po_date)} · delivery deadline{" "}
          <span className="tabular-nums">{fmt(o.delivery_deadline)}</span>
        </p>
        <div className="mt-3">
          <Lifecycle
            stage={
              (f?.deliveredQty ?? 0) > 0
                ? 4
                : (f?.steps.some((s) => s.completed_on) ?? false)
                  ? 3
                  : 2
            }
          />
        </div>
      </div>

      {sp.error && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {sp.error}
        </div>
      )}
      {sp.ok && (
        <div className="rounded-card border border-success/30 bg-success/10 p-3 text-sm text-success">
          Saved.
        </div>
      )}

      {atRisk && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Delivery at risk — expected {fmt(deliveredStep?.expected_date ?? null)}{" "}
          is after the committed deadline {fmt(o.delivery_deadline)}.
        </div>
      )}
      {f?.pdiBlocked && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          Dispatch is blocked — the latest PDI was failed or held.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Ordered", value: num(o.ordered_qty) },
          { label: "Delivered", value: num(delivered) },
          { label: "Outstanding", value: num(outstanding), danger: outstanding > 0 },
          { label: "Latest PDI", value: latestPdi?.result ?? "none" },
        ].map((t) => (
          <div key={t.label} className="rounded-card border border-border bg-surface p-4">
            <div className="text-xs text-muted">{t.label}</div>
            <div
              className={`mt-1 text-xl font-semibold capitalize ${
                t.danger ? "text-danger" : "text-ink"
              }`}
            >
              {t.value}
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-card border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Fulfilment timeline</span>
          <span className="text-xs text-muted">Owner and expected date per step</span>
        </div>
        {!ful.ok && (
          <p className="px-4 py-4 text-sm text-danger">
            Could not load fulfilment: {ful.error}
          </p>
        )}
        {f && (
          <div className="divide-y divide-border">
            {f.steps.map((s) => (
              <form
                key={s.step}
                action={updateStepAction}
                className="grid items-end gap-2 px-4 py-3 sm:grid-cols-6"
              >
                <input type="hidden" name="order_id" value={o.id} />
                <input type="hidden" name="step" value={s.step} />
                <div className="text-sm">
                  <div className="font-medium">{s.label}</div>
                  {s.completed_on && (
                    <div className="text-[11px] text-success">
                      done {fmt(s.completed_on)}
                    </div>
                  )}
                </div>
                <input
                  aria-label={`Owner ${s.label}`}
                  name="owner"
                  placeholder="Owner"
                  defaultValue={s.owner ?? ""}
                  className={input}
                />
                <input
                  aria-label={`Expected date ${s.label}`}
                  name="expected_date"
                  type="date"
                  defaultValue={s.expected_date ?? ""}
                  className={input}
                />
                <input
                  aria-label={`Completed on ${s.label}`}
                  name="completed_on"
                  type="date"
                  defaultValue={s.completed_on ?? ""}
                  className={input}
                />
                <input
                  aria-label={`Notes ${s.label}`}
                  name="notes"
                  placeholder="Notes"
                  defaultValue={s.notes ?? ""}
                  className={input}
                />
                <button
                  type="submit"
                  className="rounded-control border border-border px-3 py-2 text-sm font-medium hover:bg-page"
                >
                  Save
                </button>
              </form>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">
          PDI (offered / cleared / rejected)
        </div>

        <form action={addPdiAction} className="grid gap-2 border-b border-border p-4 sm:grid-cols-6">
          <input type="hidden" name="order_id" value={o.id} />
          <input aria-label="Inspected on" name="inspected_on" type="date" className={input} />
          <input aria-label="Offered" name="qty_offered" placeholder="Offered" inputMode="decimal" className={input} />
          <input aria-label="Cleared" name="qty_cleared" placeholder="Cleared" inputMode="decimal" className={input} />
          <input aria-label="Rejected" name="qty_rejected" placeholder="Rejected" inputMode="decimal" className={input} />
          <select aria-label="Result" name="result" defaultValue="pending" className={input}>
            <option value="pending">Pending</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="held">Held</option>
          </select>
          <button type="submit" className="rounded-control bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90">
            Record PDI
          </button>
        </form>

        {f && f.pdi.length === 0 && (
          <p className="px-4 py-4 text-sm text-muted">No PDI recorded.</p>
        )}
        {f && f.pdi.length > 0 && (
          <div className="divide-y divide-border">
            {f.pdi.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                      pdiStyle[p.result] ?? "bg-border/60 text-muted"
                    }`}
                  >
                    {p.result}
                  </span>
                  <span className="text-muted">{fmt(p.inspected_on)}</span>
                </div>
                <div className="text-xs text-muted tabular-nums">
                  offered {num(p.qty_offered)} · cleared {num(p.qty_cleared)} ·
                  rejected {num(p.qty_rejected)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">
          Deliveries (partial allowed)
        </div>

        <form action={addDeliveryAction} className="grid gap-2 border-b border-border p-4 sm:grid-cols-5">
          <input type="hidden" name="order_id" value={o.id} />
          <input aria-label="Delivered on" name="delivered_on" type="date" className={input} />
          <input aria-label="Quantity delivered" name="qty_delivered" placeholder="Qty delivered *" inputMode="decimal" className={input} />
          <select aria-label="Status" name="status" defaultValue="delivered" className={input}>
            <option value="in_transit">In transit</option>
            <option value="delivered">Delivered</option>
          </select>
          <input aria-label="Notes" name="notes" placeholder="Notes" className={input} />
          <button type="submit" className="rounded-control bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90">
            Record delivery
          </button>
        </form>

        {f && f.deliveries.length === 0 && (
          <p className="px-4 py-4 text-sm text-muted">No deliveries recorded.</p>
        )}
        {f && f.deliveries.length > 0 && (
          <div className="divide-y divide-border">
            {f.deliveries.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="capitalize text-muted">{d.status.replace("_", " ")}</span>
                <span className="tabular-nums">
                  {num(d.qty_delivered)} · {fmt(d.delivered_on)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium">Outstanding balance</span>
              <span className={`tabular-nums font-semibold ${outstanding > 0 ? "text-danger" : "text-success"}`}>
                {num(outstanding)}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">
          Payments &amp; commission
        </div>

        {!payments.ok && (
          <p className="px-4 py-4 text-sm text-danger">
            Could not load payments: {payments.error}
          </p>
        )}

        <div className="border-b border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">Invoices &amp; receipts</h3>
          <form
            action={addOrderInvoiceAction}
            className="mb-4 grid gap-2 sm:grid-cols-5"
          >
            <input type="hidden" name="order_id" value={o.id} />
            <input
              aria-label="Invoice number"
              name="invoice_number"
              placeholder="Invoice number *"
              required
              className={input}
            />
            <input aria-label="Invoice date" name="invoice_date" type="date" className={input} />
            <input aria-label="Amount" name="amount" placeholder="Amount" inputMode="decimal" className={input} />
            <input aria-label="Invoice notes" name="notes" placeholder="Notes" className={input} />
            <button
              type="submit"
              className="rounded-control border border-border px-3 py-2 text-sm font-medium hover:bg-page"
            >
              Add invoice
            </button>
          </form>
          {o.invoices.length === 0 ? (
            <p className="text-sm text-muted">No invoices on this PO yet.</p>
          ) : (
            <div className="space-y-3">
              {o.invoices.map((inv) => {
                const paid = paidByInvoice.get(inv.id) ?? 0;
                const bal = (inv.amount ?? 0) - paid;
                return (
                  <div key={inv.id} className="rounded-card border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{inv.invoice_number}</span>
                      <span className="tabular-nums text-xs text-muted">
                        amount {num(inv.amount)} · paid {num(paid)} · balance{" "}
                        <span className={bal > 0 ? "text-danger" : "text-success"}>
                          {num(bal)}
                        </span>
                      </span>
                    </div>
                    <form
                      action={addPaymentAction}
                      className="mt-2 grid gap-2 sm:grid-cols-5"
                    >
                      <input type="hidden" name="order_id" value={o.id} />
                      <input type="hidden" name="invoice_id" value={inv.id} />
                      <input
                        aria-label="Amount"
                        name="amount"
                        placeholder="Amount *"
                        inputMode="decimal"
                        className={input}
                      />
                      <input aria-label="Paid on" name="paid_on" type="date" className={input} />
                      <input aria-label="Mode" name="mode" placeholder="RTGS/NEFT" className={input} />
                      <input aria-label="Reference" name="reference" placeholder="Reference" className={input} />
                      <button
                        type="submit"
                        className="rounded-control border border-border px-3 py-2 text-sm font-medium hover:bg-page"
                      >
                        Add payment
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="mb-1 text-sm font-semibold">Commission</h3>
          <p className="mb-3 text-xs text-muted">
            Provisional model — earned on an OEM-payment milestone (Q2 to confirm
            with the client).
          </p>

          <form
            action={createCommissionAction}
            className="grid gap-2 sm:grid-cols-5"
          >
            <input type="hidden" name="order_id" value={o.id} />
            <select aria-label="OEM" name="oem_id" defaultValue="" className={input}>
              <option value="">OEM…</option>
              {oemOptions.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Base amount"
              name="base_amount"
              placeholder="Base amount *"
              inputMode="decimal"
              className={input}
            />
            <input
              aria-label="Commission percent"
              name="commission_pct"
              placeholder="Commission %"
              inputMode="decimal"
              className={input}
            />
            <input aria-label="Notes" name="notes" placeholder="Notes" className={input} />
            <button
              type="submit"
              className="rounded-control bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Add commission
            </button>
          </form>

          {commission.ok && commission.rows.length > 0 && (
            <div className="mt-3 divide-y divide-border">
              {commission.rows.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span>{c.oem_name ?? "—"}</span>
                    <span className="tabular-nums text-xs text-muted">
                      base {num(c.base_amount)} · {c.commission_pct ?? "—"}% · ₹
                      {num(c.commission_amount ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                        c.status === "paid"
                          ? "bg-success/15 text-success"
                          : c.status === "earned"
                            ? "bg-primary/10 text-primary"
                            : "bg-border/60 text-muted"
                      }`}
                    >
                      {c.status}
                    </span>
                    <form
                      action={setCommissionStatusAction}
                      className="flex items-center gap-1"
                    >
                      <input type="hidden" name="order_id" value={o.id} />
                      <input type="hidden" name="commission_id" value={c.id} />
                      <select
                        aria-label="Commission status"
                        name="status"
                        defaultValue={c.status}
                        className="rounded-control border border-border bg-surface px-2 py-1 text-xs"
                      >
                        <option value="pending">Pending</option>
                        <option value="earned">Earned</option>
                        <option value="paid">Paid</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-control border border-border px-2 py-1 text-xs font-medium hover:bg-page"
                      >
                        Set
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
          {commission.ok && commission.rows.length === 0 && (
            <p className="mt-3 text-sm text-muted">No commission recorded.</p>
          )}
        </div>
      </section>
        </div>

        <aside className="space-y-4">
          <div className="panel p-4">
            <div className="label">Next action</div>
            <div className="mt-1 text-sm font-medium">{nextAction}</div>
            {nextStep?.expected_date && (
              <div className="mt-0.5 text-xs text-muted">
                Expected {fmt(nextStep.expected_date)}
              </div>
            )}
          </div>
          <div className="panel p-4">
            <div className="label">Health</div>
            <div className="mt-1">
              <StatusPill kind={evaluation.code} />
            </div>
            <div className="mt-0.5 text-xs text-muted">{evaluation.reason}</div>
          </div>
          <div className="panel p-4">
            <div className="label">Important dates</div>
            <dl className="mt-1 space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted">PO date</dt>
                <dd className="font-mono">{fmt(o.po_date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery deadline</dt>
                <dd className="font-mono">{fmt(o.delivery_deadline)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
