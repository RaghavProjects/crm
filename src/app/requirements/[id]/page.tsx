import Link from "next/link";
import { getRequirement } from "@/lib/requirements";
import { listSourcing } from "@/lib/sourcing";
import { listOemOptions } from "@/lib/oems";
import { shortlistOemAction, logResponseAction } from "./actions";

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
  const oemOptions = await listOemOptions();

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
          Submission deadline: <span className="tabular-nums">{fmt(r.submission_deadline)}</span>
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
                  <th className="px-4 py-3 font-medium">OEM part no.</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                </tr>
              </thead>
              <tbody>
                {r.lines.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-4 py-3">{l.part_description}</td>
                    <td className="px-4 py-3 text-muted">{l.client_part_no ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{l.oem_part_no ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {l.quantity ?? "—"} {l.unit ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <label className={label} htmlFor="oem_id">
              Shortlist an OEM
            </label>
            <select id="oem_id" name="oem_id" required className={input} defaultValue="">
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
