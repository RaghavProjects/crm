import { listDocuments, expiryState } from "@/lib/documents";
import { createDocumentAction } from "./actions";

const input =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";
const label = "block text-xs font-medium text-muted";

const DOC_TYPES = [
  "RFQ",
  "Technical drawing",
  "Compliance certificate",
  "Quotation",
  "Purchase order",
  "Invoice",
  "PDI report",
  "Test certificate",
  "Delivery challan",
  "Other",
];

const expiryStyle: Record<string, string> = {
  none: "bg-border/60 text-muted",
  ok: "bg-success/15 text-[#15803d]",
  soon: "bg-warning/15 text-[#b45309]",
  expired: "bg-danger/15 text-[#b91c1c]",
};
const expiryLabel: Record<string, string> = {
  none: "No expiry",
  ok: "Valid",
  soon: "Expiring soon",
  expired: "Expired",
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

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const res = await listDocuments();

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">
          Documents &amp; compliance
        </h1>
        <p className="mt-1 text-sm text-muted">
          The vault — documents with issue and expiry dates. Expiring within 90
          days is flagged.
        </p>
      </div>

      {sp.error && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-[#b91c1c]">
          {sp.error}
        </div>
      )}
      {sp.ok && (
        <div className="rounded-card border border-success/30 bg-success/10 p-3 text-sm text-[#15803d]">
          Document saved.
        </div>
      )}

      <section className="rounded-card border border-border bg-surface p-4 md:p-6">
        <h2 className="text-sm font-semibold">Add a document</h2>
        <form action={createDocumentAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="doc_type">
              Type *
            </label>
            <select id="doc_type" name="doc_type" required defaultValue="" className={input}>
              <option value="" disabled>
                Select…
              </option>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="title">
              Title *
            </label>
            <input id="title" name="title" required className={input} />
          </div>
          <div>
            <label className={label} htmlFor="supplier">
              Supplier / source
            </label>
            <input id="supplier" name="supplier" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="doc_no">
              Document number
            </label>
            <input id="doc_no" name="doc_no" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="product">
              Product / part
            </label>
            <input id="product" name="product" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="issue_date">
              Issue date
            </label>
            <input id="issue_date" name="issue_date" type="date" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="expiry_date">
              Expiry date
            </label>
            <input id="expiry_date" name="expiry_date" type="date" className={input} />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Save document
            </button>
          </div>
        </form>
      </section>

      {!res.ok && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-[#b91c1c]">
          Could not load documents: {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-muted">
          No documents yet.
        </div>
      )}

      {res.rows.length > 0 && (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-page text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Expiry</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {res.rows.map((d) => {
                const state = expiryState(d.expiry_date);
                return (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{d.title}</td>
                    <td className="px-4 py-3 text-muted">{d.doc_type}</td>
                    <td className="px-4 py-3 text-muted">{d.supplier ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{fmt(d.issue_date)}</td>
                    <td className="px-4 py-3 text-muted">{fmt(d.expiry_date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${expiryStyle[state]}`}
                      >
                        {expiryLabel[state]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
