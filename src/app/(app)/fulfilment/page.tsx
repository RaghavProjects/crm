import Link from "next/link";
import { listFulfilmentBoard, STEPS_TOTAL } from "@/lib/boards";

function fmt(d: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${d}T00:00:00Z`));
}

const pdiColor: Record<string, string> = {
  passed: "bg-success",
  failed: "bg-danger",
  held: "bg-warning",
  pending: "bg-muted",
};

export default async function FulfilmentPage() {
  const res = await listFulfilmentBoard();

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <span className="label">Work</span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
          Fulfilment
        </h1>
        <p className="mt-1 text-sm text-muted">
          Orders by fulfilment progress, PDI state and outstanding quantity.
        </p>
      </div>

      {!res.ok && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          Could not load fulfilment: {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="rounded-card border border-border bg-surface p-12 text-center text-sm text-muted">
          No orders in fulfilment yet.
        </div>
      )}

      {res.rows.length > 0 && (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="label px-4 py-2.5 font-medium">PO number</th>
                <th className="label px-4 py-2.5 font-medium">Requirement</th>
                <th className="label px-4 py-2.5 font-medium">OEM</th>
                <th className="label px-4 py-2.5 font-medium">Deadline</th>
                <th className="label px-4 py-2.5 font-medium">Steps</th>
                <th className="label px-4 py-2.5 font-medium">PDI</th>
                <th className="label px-4 py-2.5 text-right font-medium">
                  Outstanding
                </th>
              </tr>
            </thead>
            <tbody>
              {res.rows.map((o) => {
                const outstanding = Math.max(0, o.ordered - o.delivered);
                return (
                  <tr key={o.order_id} className="group border-t border-border hover:bg-page/70">
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${o.order_id}`}
                        className="font-mono text-[13px] font-medium group-hover:text-primary"
                      >
                        {o.po_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted">
                      {o.tender_ref}
                    </td>
                    <td className="px-4 py-3 text-muted">{o.oem_name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[13px]">
                      {fmt(o.deadline)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {o.steps_done}/{STEPS_TOTAL}
                    </td>
                    <td className="px-4 py-3">
                      {o.pdi ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className={`size-1.5 rounded-full ${pdiColor[o.pdi] ?? "bg-muted"}`}
                          />
                          <span className="capitalize text-ink">{o.pdi}</span>
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-[13px] ${
                        outstanding > 0 ? "text-danger" : "text-success"
                      }`}
                    >
                      {outstanding}
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
