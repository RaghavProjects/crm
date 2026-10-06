import Link from "next/link";
import { getOrder } from "@/lib/orders";
import { listFulfilment } from "@/lib/fulfilment";
import { updateStepAction, addPdiAction, addDeliveryAction } from "./actions";

const input =
  "w-full rounded-control border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary";

const pdiStyle: Record<string, string> = {
  pending: "bg-border/60 text-muted",
  passed: "bg-success/15 text-[#15803d]",
  failed: "bg-danger/15 text-[#b91c1c]",
  held: "bg-warning/15 text-[#b45309]",
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
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-[#b91c1c]">
          Could not load order: {res.error}
        </div>
      </div>
    );
  }

  const o = res.data;
  const ful = await listFulfilment(id);
  const f = ful.ok ? ful.data : null;
  const delivered = f?.deliveredQty ?? 0;
  const outstanding = Math.max(0, o.ordered_qty - delivered);
  const latestPdi = f?.pdi[0] ?? null;
  const deliveredStep = f?.steps.find((s) => s.step === "delivered");
  const atRisk =
    !!o.delivery_deadline &&
    !!deliveredStep?.expected_date &&
    deliveredStep.expected_date > o.delivery_deadline;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <Link
          href={`/requirements/${o.requirement_id}`}
          className="text-xs text-muted hover:text-ink"
        >
          ← {o.tender_ref}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-semibold tracking-tight">
            PO {o.po_number}
          </h1>
          {o.pdi_required && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-[#b45309]">
              PDI required
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          {o.customer} · {o.tender_ref}
          {o.oem_name ? ` · OEM ${o.oem_name}` : ""}
          {o.supplier_po ? ` · supplier PO ${o.supplier_po}` : ""}
        </p>
        <p className="mt-1 text-sm text-muted">
          PO date {fmt(o.po_date)} · delivery deadline{" "}
          <span className="tabular-nums">{fmt(o.delivery_deadline)}</span>
        </p>
      </div>

      {sp.error && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-[#b91c1c]">
          {sp.error}
        </div>
      )}
      {sp.ok && (
        <div className="rounded-card border border-success/30 bg-success/10 p-3 text-sm text-[#15803d]">
          Saved.
        </div>
      )}

      {atRisk && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-[#b91c1c]">
          Delivery at risk — expected {fmt(deliveredStep?.expected_date ?? null)}{" "}
          is after the committed deadline {fmt(o.delivery_deadline)}.
        </div>
      )}
      {f?.pdiBlocked && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-[#b91c1c]">
          Dispatch is blocked — the latest PDI was failed or held.
        </div>
      )}

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
          <p className="px-4 py-4 text-sm text-[#b91c1c]">
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
                    <div className="text-[11px] text-[#15803d]">
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
              <span className={`tabular-nums font-semibold ${outstanding > 0 ? "text-danger" : "text-[#15803d]"}`}>
                {num(outstanding)}
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
