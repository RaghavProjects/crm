import Link from "next/link";
import { listAllQuotes } from "@/lib/boards";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function StatusDot({ value }: { value: string }) {
  const color = value === "approved" ? "bg-success" : "bg-muted";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`size-1.5 rounded-full ${color}`} />
      <span className="capitalize text-ink">{value}</span>
    </span>
  );
}

export default async function QuotationsPage() {
  const res = await listAllQuotes();
  const approved = res.rows.filter((q) => q.status === "approved").length;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <span className="label">Work</span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
          Quotations
        </h1>
      </div>

      {res.ok && res.rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-border py-2.5 text-sm text-muted">
          <span>
            <b className="font-semibold text-ink">{res.rows.length}</b> total
          </span>
          <span aria-hidden className="text-border">·</span>
          <span>
            <b className="font-semibold text-ink">{approved}</b> approved
          </span>
        </div>
      )}

      {!res.ok && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          Could not load quotations: {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="rounded-card border border-border bg-surface p-12 text-center text-sm text-muted">
          No quotations yet — build one from a requirement.
        </div>
      )}

      {res.rows.length > 0 && (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="label px-4 py-2.5 font-medium">Tender ref</th>
                <th className="label px-4 py-2.5 font-medium">Customer</th>
                <th className="label px-4 py-2.5 font-medium">Version</th>
                <th className="label px-4 py-2.5 text-right font-medium">
                  Recommended total
                </th>
                <th className="label px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {res.rows.map((q) => (
                <tr key={q.id} className="group border-t border-border hover:bg-page/70">
                  <td className="px-4 py-3">
                    <Link
                      href={`/requirements/${q.requirement_id}`}
                      className="font-mono text-[13px] font-medium group-hover:text-primary"
                    >
                      {q.tender_ref}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{q.customer}</td>
                  <td className="px-4 py-3 text-muted">v{q.version}</td>
                  <td className="px-4 py-3 text-right font-mono text-[13px]">
                    {inr(q.total)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusDot value={q.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
