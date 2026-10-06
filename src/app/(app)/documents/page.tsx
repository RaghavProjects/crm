import { listDocuments } from "@/lib/documents";
import { DocumentsTable } from "@/components/DocumentsTable";
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

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const res = await listDocuments();

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div>
        <span className="label">Library</span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-muted">
          Repository — filter by type, with expiry tracked.
        </p>
      </div>

      {sp.error && <div className="panel border-danger/30 bg-critical-tint p-3 text-sm text-danger">{sp.error}</div>}
      {sp.ok && <div className="panel border-success/30 bg-forest-tint p-3 text-sm text-success">Document saved.</div>}

      <section className="panel p-4 md:p-6">
        <h2 className="text-sm font-semibold">Add a document</h2>
        <form action={createDocumentAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="doc_type">Type *</label>
            <select id="doc_type" name="doc_type" required defaultValue="" className={input}>
              <option value="" disabled>Select…</option>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="title">Title *</label>
            <input id="title" name="title" required className={input} />
          </div>
          <div>
            <label className={label} htmlFor="supplier">Supplier / source</label>
            <input id="supplier" name="supplier" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="issue_date">Issue date</label>
            <input id="issue_date" name="issue_date" type="date" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="expiry_date">Expiry date</label>
            <input id="expiry_date" name="expiry_date" type="date" className={input} />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
              Save document
            </button>
          </div>
        </form>
      </section>

      {!res.ok && (
        <div className="panel border-danger/30 bg-critical-tint p-3 text-sm text-danger">
          Documents couldn&apos;t be loaded. {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="panel p-12 text-center text-sm text-muted">No documents yet.</div>
      )}

      {res.ok && res.rows.length > 0 && <DocumentsTable rows={res.rows} />}
    </div>
  );
}
