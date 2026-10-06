import Link from "next/link";
import { getRequirement } from "@/lib/requirements";
import { listSourcing } from "@/lib/sourcing";
import { listCoverage } from "@/lib/coverage";
import { listQuotes, getPastBids } from "@/lib/quotes";
import { listOrders } from "@/lib/orders";
import { listOemOptions } from "@/lib/oems";
import { QuoteForm } from "./QuoteForm";
import {
  shortlistOemAction,
  logResponseAction,
  addCoverageAction,
  deleteCoverageAction,
  approveQuoteAction,
  createOrderAction,
  addInvoiceAction,
} from "./actions";

const input =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";
const label = "block text-xs font-medium text-muted";

const reqStatusStyle: Record<string, string> = {
  received: "bg-border/60 text-muted",
  qualifying: "bg-warning/15 text-[#b45309]",
  quoted: "bg-primary/10 text-primary",
  submitted: "bg-primary/10 text-primary",
  won: "bg-success/15 text-[#15803d]",
  lost: "bg-danger/15 text-[#b91c1c]",
  cancelled: "bg-border/60 text-muted",
};

const sourcingStyle: Record<string, string> = {
  shortlisted: "bg-border/60 text-muted",
  requested: "bg-primary/10 text-primary",
  responded: "bg-success/15 text-[#15803d]",
  declined: "bg-danger/15 text-[#b91c1c]",
};

function Badge({ value, map }: { value: string; map: Record<string, string> }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
        map[value] ?? "bg-border/60 text-muted"
      }`}
    >
      {value}
    </span>
  );
}

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

export default async function RequirementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const res = await getRequirement(id);

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/" className="text-xs text-muted hover:text-ink">
          ← Requirements
        </Link>
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-[#b91c1c]">
          Could not load requirement: {res.error}
        </div>
      </div>
    );
  }

  const r = res.data;
  const sourcing = await listSourcing(id);
  const coverage = await listCoverage(id);
  const oemOptions = await listOemOptions();
  const quotes = await listQuotes(id);
  const orders = await listOrders(id);
  const keyword = r.lines[0]?.part_description?.split(/\s+/)[0] ?? null;
  const pastBids = await getPastBids(id, keyword);
  const approvedQuotes = quotes.ok
    ? quotes.rows.filter((q) => q.status === "approved")
    : [];

  // Per-line firm / availability totals, from the coverage records.
  const byLine = new Map<string, { firm: number; avail: number }>();
  for (const c of coverage.rows) {
    const cur = byLine.get(c.line_id) ?? { firm: 0, avail: 0 };
    if (c.kind === "firm") cur.firm += c.quantity;
    else cur.avail += c.quantity;
    byLine.set(c.line_id, cur);
  }

  const required = r.lines.reduce((s, l) => s + (l.quantity ?? 0), 0);
  const firm = coverage.rows
    .filter((c) => c.kind === "firm")
    .reduce((s, c) => s + c.quantity, 0);
  const avail = coverage.rows
    .filter((c) => c.kind === "availability")
    .reduce((s, c) => s + c.quantity, 0);
  const uncovered = Math.max(0, required - firm);
  const covered = required > 0 && uncovered === 0 && firm > 0;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <Link href="/" className="text-xs text-muted hover:text-ink">
          ← Requirements
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-semibold tracking-tight">
            {r.tender_ref}
          </h1>
          <Badge value={r.status} map={reqStatusStyle} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {r.customer}
          {r.project ? ` · ${r.project}` : ""}
          {r.source ? ` · ${r.source}` : ""}
        </p>
        <p className="mt-1 text-sm text-muted">
          Submission deadline:{" "}
          <span className="tabular-nums">{fmt(r.submission_deadline)}</span>
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

      <section className="rounded-card border border-border bg-surface">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">
          Line items{" "}
          <span className="font-normal text-muted">({r.lines.length})</span>
        </div>
        {r.lines.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">No line items.</p>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-page text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Part description</th>
                  <th className="px-4 py-3 font-medium">Client part no.</th>
                  <th className="px-4 py-3 text-right font-medium">Required</th>
                  <th className="px-4 py-3 text-right font-medium">Firm covered</th>
                  <th className="px-4 py-3 text-right font-medium">Uncovered</th>
                </tr>
              </thead>
              <tbody>
                {r.lines.map((l) => {
                  const cov = byLine.get(l.id) ?? { firm: 0, avail: 0 };
                  const u = Math.max(0, (l.quantity ?? 0) - cov.firm);
                  return (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-4 py-3">{l.part_description}</td>
                      <td className="px-4 py-3 text-muted">
                        {l.client_part_no ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {l.quantity ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {cov.firm}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          u > 0 ? "font-medium text-danger" : "text-[#15803d]"
                        }`}
                      >
                        {u}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Quantity coverage</span>
          <span className="text-xs text-muted">
            Per-order capacity (Q1) · firm commitments count, availability does not
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-border p-4 lg:grid-cols-4">
          {[
            { label: "Required", value: num(required) },
            { label: "Firm covered", value: num(firm) },
            {
              label: "Uncovered",
              value: num(uncovered),
              danger: true,
            },
            { label: "Availability (indicative)", value: num(avail) },
          ].map((t) => (
            <div key={t.label} className="rounded-card border border-border p-3">
              <div className="text-xs text-muted">{t.label}</div>
              <div
                className={`mt-1 text-xl font-semibold ${
                  t.danger && uncovered > 0 ? "text-danger" : "text-ink"
                }`}
              >
                {t.value}
              </div>
            </div>
          ))}
        </div>

        <div className="border-b border-border px-4 py-2 text-sm">
          {covered ? (
            <span className="font-medium text-[#15803d]">
              Fully covered by firm commitments.
            </span>
          ) : required === 0 ? (
            <span className="text-muted">Add line items with quantities to cover.</span>
          ) : (
            <span className="font-medium text-danger">
              Not fully covered — {num(uncovered)} still uncovered.
            </span>
          )}
        </div>

        {oemOptions.length === 0 || r.lines.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">
            {r.lines.length === 0
              ? "Add line items to the requirement first."
              : "Add an OEM before recording commitments."}
          </p>
        ) : (
          <form
            action={addCoverageAction}
            className="grid gap-3 border-b border-border p-4 sm:grid-cols-6"
          >
            <input type="hidden" name="requirement_id" value={r.id} />
            <div className="sm:col-span-2">
              <label className={label} htmlFor="line_id">
                Line item
              </label>
              <select
                id="line_id"
                name="line_id"
                required
                defaultValue=""
                className={input}
              >
                <option value="" disabled>
                  Select line…
                </option>
                {r.lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.part_description}
                    {l.quantity != null ? ` (req ${l.quantity})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="oem_id">
                OEM
              </label>
              <select
                id="oem_id"
                name="oem_id"
                required
                defaultValue=""
                className={input}
              >
                <option value="" disabled>
                  Select…
                </option>
                {oemOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="kind">
                Kind
              </label>
              <select id="kind" name="kind" className={input} defaultValue="firm">
                <option value="firm">Firm commitment</option>
                <option value="availability">Availability</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="quantity">
                Quantity
              </label>
              <input
                id="quantity"
                name="quantity"
                inputMode="decimal"
                required
                className={input}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-control bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Add
              </button>
            </div>
          </form>
        )}

        {!coverage.ok && (
          <p className="px-4 py-4 text-sm text-[#b91c1c]">
            Could not load coverage: {coverage.error}
          </p>
        )}

        {coverage.ok && coverage.rows.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted">
            No commitments recorded yet.
          </p>
        )}

        {coverage.rows.length > 0 && (
          <div className="divide-y divide-border">
            {coverage.rows.map((c) => {
              const line = r.lines.find((l) => l.id === c.line_id);
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-medium">{c.oem_name}</span>
                    <Badge
                      value={c.kind}
                      map={{
                        firm: "bg-success/15 text-[#15803d]",
                        availability: "bg-warning/15 text-[#b45309]",
                      }}
                    />
                    <span className="text-muted">
                      {line?.part_description ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums">
                      {num(c.quantity)}
                      {c.delivery_date ? ` · by ${fmt(c.delivery_date)}` : ""}
                    </span>
                    <form action={deleteCoverageAction}>
                      <input type="hidden" name="requirement_id" value={r.id} />
                      <input type="hidden" name="coverage_id" value={c.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-danger hover:underline"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Quotations</span>
          <span className="text-xs text-muted">
            Versioned · approved by a person
          </span>
        </div>

        {!quotes.ok && (
          <p className="px-4 py-4 text-sm text-[#b91c1c]">
            Could not load quotes: {quotes.error}
          </p>
        )}

        {quotes.ok && quotes.rows.length > 0 && (
          <div className="divide-y divide-border">
            {quotes.rows.map((q) => {
              const total = q.lines.reduce(
                (s, l) => s + (l.recommended_price ?? 0) * (l.quantity ?? 0),
                0,
              );
              return (
                <div key={q.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        Version {q.version}
                      </span>
                      <Badge
                        value={q.status}
                        map={{
                          draft: "bg-border/60 text-muted",
                          approved: "bg-success/15 text-[#15803d]",
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>
                        Recommended total{" "}
                        <span className="font-medium tabular-nums text-ink">
                          ₹{num(total)}
                        </span>
                      </span>
                      {q.status !== "approved" && (
                        <form action={approveQuoteAction}>
                          <input
                            type="hidden"
                            name="requirement_id"
                            value={r.id}
                          />
                          <input type="hidden" name="quote_id" value={q.id} />
                          <button
                            type="submit"
                            className="rounded-control border border-border px-3 py-1.5 text-xs font-medium hover:bg-page"
                          >
                            Approve
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-muted">
                    {q.lines.map((l) => (
                      <li key={l.id}>
                        {l.description} · qty {l.quantity ?? "—"} · OEM ₹
                        {num(l.oem_price)} · margin {l.margin_pct ?? "—"}% ·
                        recommended ₹{num(l.recommended_price ?? 0)}
                      </li>
                    ))}
                  </ul>
                  {q.approved_by && (
                    <p className="mt-1 text-xs text-[#15803d]">
                      Approved by {q.approved_by}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {r.lines.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">
            Add line items before quoting.
          </p>
        ) : (
          <div className="border-t border-border p-4">
            <h3 className="mb-3 text-sm font-semibold">New quotation</h3>
            <QuoteForm
              requirementId={r.id}
              lines={r.lines.map((l) => ({
                description: l.part_description,
                quantity: l.quantity == null ? "" : String(l.quantity),
              }))}
            />
          </div>
        )}

        <div className="border-t border-border p-4">
          <h3 className="mb-2 text-sm font-semibold">Comparable past bids</h3>
          {pastBids.length === 0 ? (
            <p className="text-sm text-muted">
              No comparable past bids yet — outcomes are captured from now on.
            </p>
          ) : (
            <div className="overflow-hidden rounded-card border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-page text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Tender</th>
                    <th className="px-3 py-2 text-right font-medium">OEM price</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Recommended
                    </th>
                    <th className="px-3 py-2 font-medium">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {pastBids.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="px-3 py-2">{b.description}</td>
                      <td className="px-3 py-2 text-muted">{b.tender_ref}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        ₹{num(b.oem_price)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        ₹{num(b.recommended_price ?? 0)}
                      </td>
                      <td className="px-3 py-2">
                        <Badge value={b.requirement_status} map={reqStatusStyle} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Orders &amp; POs</span>
          <span className="text-xs text-muted">
            No orphan PO · always from an approved quotation
          </span>
        </div>

        {!orders.ok && (
          <p className="px-4 py-4 text-sm text-[#b91c1c]">
            Could not load orders: {orders.error}
          </p>
        )}

        {approvedQuotes.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">
            Approve a quotation before creating an order.
          </p>
        ) : (
          <form
            action={createOrderAction}
            className="grid gap-3 border-b border-border p-4 sm:grid-cols-3"
          >
            <input type="hidden" name="requirement_id" value={r.id} />
            <div>
              <label className={label} htmlFor="quote_id">
                Approved quotation
              </label>
              <select
                id="quote_id"
                name="quote_id"
                required
                defaultValue={approvedQuotes[0].id}
                className={input}
              >
                {approvedQuotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    Version {q.version}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="po_number">
                PO number *
              </label>
              <input id="po_number" name="po_number" required className={input} />
            </div>
            <div>
              <label className={label} htmlFor="po_date">
                PO date
              </label>
              <input id="po_date" name="po_date" type="date" className={input} />
            </div>
            <div>
              <label className={label} htmlFor="delivery_deadline">
                Delivery deadline
              </label>
              <input
                id="delivery_deadline"
                name="delivery_deadline"
                type="date"
                className={input}
              />
            </div>
            <div>
              <label className={label} htmlFor="oem_id_order">
                OEM
              </label>
              <select id="oem_id_order" name="oem_id" defaultValue="" className={input}>
                <option value="">—</option>
                {oemOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="supplier_po">
                Supplier PO
              </label>
              <input id="supplier_po" name="supplier_po" className={input} />
            </div>
            <div className="flex items-end gap-4 sm:col-span-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="pdi_required" /> PDI required
              </label>
              <button
                type="submit"
                className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Create order
              </button>
            </div>
          </form>
        )}

        {orders.ok && orders.rows.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted">No orders yet.</p>
        )}

        {orders.rows.length > 0 && (
          <div className="divide-y divide-border">
            {orders.rows.map((o) => (
              <div key={o.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">PO {o.po_number}</span>
                    <Badge
                      value={o.status}
                      map={{
                        open: "bg-primary/10 text-primary",
                        completed: "bg-success/15 text-[#15803d]",
                        cancelled: "bg-border/60 text-muted",
                      }}
                    />
                    {o.pdi_required && (
                      <span className="text-[11px] text-muted">PDI required</span>
                    )}
                  </div>
                  <div className="text-xs text-muted">
                    {o.oem_name ? `OEM ${o.oem_name} · ` : ""}
                    PO date {fmt(o.po_date)} · due {fmt(o.delivery_deadline)}
                    {o.supplier_po ? ` · supplier PO ${o.supplier_po}` : ""}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-medium text-muted">
                    Invoices ({o.invoices.length})
                  </div>
                  {o.invoices.length > 0 && (
                    <ul className="mt-1 space-y-1 text-xs text-muted">
                      {o.invoices.map((i) => (
                        <li key={i.id}>
                          {i.invoice_number} · {fmt(i.invoice_date)}
                          {i.amount != null ? ` · ₹${num(i.amount)}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  <form
                    action={addInvoiceAction}
                    className="mt-2 grid gap-2 sm:grid-cols-4"
                  >
                    <input type="hidden" name="requirement_id" value={r.id} />
                    <input type="hidden" name="order_id" value={o.id} />
                    <input
                      aria-label="Invoice number"
                      name="invoice_number"
                      placeholder="Invoice number *"
                      required
                      className={input}
                    />
                    <input
                      aria-label="Invoice date"
                      name="invoice_date"
                      type="date"
                      className={input}
                    />
                    <input
                      aria-label="Amount"
                      name="amount"
                      placeholder="Amount"
                      inputMode="decimal"
                      className={input}
                    />
                    <button
                      type="submit"
                      className="rounded-control border border-border px-3 py-2 text-sm font-medium hover:bg-page"
                    >
                      Add invoice
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">
          OEM sourcing
        </div>

        <form
          action={shortlistOemAction}
          className="flex flex-wrap items-end gap-3 border-b border-border p-4"
        >
          <input type="hidden" name="requirement_id" value={r.id} />
          <div className="min-w-[200px] flex-1">
            <label className={label} htmlFor="oem_id_sourcing">
              Shortlist an OEM
            </label>
            <select
              id="oem_id_sourcing"
              name="oem_id"
              required
              className={input}
              defaultValue=""
            >
              <option value="" disabled>
                {oemOptions.length ? "Select OEM…" : "No OEMs yet — add one first"}
              </option>
              {oemOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className={label} htmlFor="request_notes">
              Request note
            </label>
            <input id="request_notes" name="request_notes" className={input} />
          </div>
          <button
            type="submit"
            className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Send request
          </button>
        </form>

        {!sourcing.ok && (
          <p className="px-4 py-4 text-sm text-[#b91c1c]">
            Could not load sourcing: {sourcing.error}
          </p>
        )}

        {sourcing.ok && sourcing.rows.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted">
            No OEMs shortlisted yet.
          </p>
        )}

        {sourcing.rows.length > 0 && (
          <div className="divide-y divide-border">
            {sourcing.rows.map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{s.oem_name}</span>
                    <Badge value={s.status} map={sourcingStyle} />
                  </div>
                  <div className="text-xs text-muted">
                    requested {fmt(s.requested_on)}
                    {s.lead_time_days != null ? ` · lead ${s.lead_time_days} d` : ""}
                    {s.quoted_price != null ? ` · ₹${s.quoted_price}` : ""}
                  </div>
                </div>
                {s.request_notes && (
                  <p className="mt-1 text-xs text-muted">Note: {s.request_notes}</p>
                )}

                <form
                  action={logResponseAction}
                  className="mt-3 grid gap-3 sm:grid-cols-5"
                >
                  <input type="hidden" name="requirement_id" value={r.id} />
                  <input type="hidden" name="sourcing_id" value={s.id} />
                  <select
                    aria-label="Status"
                    name="status"
                    defaultValue={s.status}
                    className={input}
                  >
                    <option value="shortlisted">Shortlisted</option>
                    <option value="requested">Requested</option>
                    <option value="responded">Responded</option>
                    <option value="declined">Declined</option>
                  </select>
                  <input
                    aria-label="Response note"
                    name="response_notes"
                    placeholder="Response note"
                    defaultValue={s.response_notes ?? ""}
                    className={`${input} sm:col-span-2`}
                  />
                  <input
                    aria-label="Quoted price"
                    name="quoted_price"
                    placeholder="Quoted price"
                    inputMode="decimal"
                    defaultValue={s.quoted_price ?? ""}
                    className={input}
                  />
                  <button
                    type="submit"
                    className="rounded-control border border-border px-3 py-2 text-sm font-medium hover:bg-page"
                  >
                    Log response
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
