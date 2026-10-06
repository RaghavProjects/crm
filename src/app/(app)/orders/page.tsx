import Link from "next/link";
import { listAllOrders } from "@/lib/orders";

function fmt(d: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${d}T00:00:00Z`));
}

const statusColor: Record<string, string> = {
  open: "bg-primary",
  completed: "bg-success",
  cancelled: "bg-muted",
};

function StatusDot({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`size-1.5 rounded-full ${statusColor[value] ?? "bg-muted"}`} />
      <span className="capitalize text-ink">{value}</span>
    </span>
  );
}

export default async function OrdersPage() {
  const res = await listAllOrders();
  const openCount = res.rows.filter((o) => o.status === "open").length;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <span className="label">Work</span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
          Orders &amp; POs
        </h1>
      </div>

      {res.ok && res.rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-border py-2.5 text-sm text-muted">
          <span>
            <b className="font-semibold text-ink">{openCount}</b> open
          </span>
          <span aria-hidden className="text-border">·</span>
          <span>
            <b className="font-semibold text-ink">{res.rows.length}</b> total
          </span>
        </div>
      )}

      {!res.ok && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          Could not load orders: {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="rounded-card border border-border bg-surface p-12 text-center text-sm text-muted">
          No orders yet — create one from an approved quotation on a requirement.
        </div>
      )}

      {res.rows.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-card border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="label px-4 py-2.5 font-medium">PO number</th>
                  <th className="label px-4 py-2.5 font-medium">Customer</th>
                  <th className="label px-4 py-2.5 font-medium">Requirement</th>
                  <th className="label px-4 py-2.5 font-medium">OEM</th>
                  <th className="label px-4 py-2.5 font-medium">Delivery</th>
                  <th className="label px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {res.rows.map((o) => (
                  <tr
                    key={o.id}
                    className="group border-t border-border hover:bg-page/70"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-mono text-[13px] font-medium group-hover:text-primary"
                      >
                        {o.po_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{o.customer}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted">
                      {o.tender_ref}
                    </td>
                    <td className="px-4 py-3 text-muted">{o.oem_name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[13px]">
                      {fmt(o.delivery_deadline)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusDot value={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {res.rows.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="block rounded-card border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[13px] font-medium">
                      {o.po_number}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {o.customer} · {o.tender_ref}
                    </div>
                  </div>
                  <StatusDot value={o.status} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <span>{o.oem_name ?? "no OEM"}</span>
                  <span className="font-mono">{fmt(o.delivery_deadline)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
