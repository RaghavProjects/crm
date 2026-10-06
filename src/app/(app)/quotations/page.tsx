import { listAllQuotes } from "@/lib/boards";
import { QuotationsTable } from "@/components/QuotationsTable";
import { plural } from "@/lib/format";

export default async function QuotationsPage() {
  const res = await listAllQuotes();
  const approved = res.rows.filter((q) => q.status === "approved").length;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div>
        <span className="label">Sales</span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Quotations</h1>
        <p className="mt-1 text-sm text-muted">
          {res.ok
            ? `${plural(res.rows.length, "quotation")} · ${plural(approved, "approved")}`
            : "Commercial quotation workflow"}
        </p>
      </div>

      {!res.ok && (
        <div className="panel border-danger/30 bg-critical-tint p-3 text-sm text-danger">
          Quotations couldn&apos;t be loaded. {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="panel p-12 text-center text-sm text-muted">
          No quotations yet — build one from a requirement.
        </div>
      )}

      {res.ok && res.rows.length > 0 && <QuotationsTable rows={res.rows} />}
    </div>
  );
}
