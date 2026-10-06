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

const statusStyle: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  completed: "bg-success/15 text-[#15803d]",
  cancelled: "bg-border/60 text-muted",
};

export default async function OrdersPage() {
  const res = await listAllOrders();

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight md:text-[28px]">
          Orders &amp; POs
        </h1>
        <p className="mt-1 text-sm text-muted">
          Every purchase order, with its requirement and OEM.
        </p>
      </div>

      {!res.ok && (
        <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-sm text-[#b91c1c]">
          Could not load orders: {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-sm text-muted">
          No orders yet — create one from an approved quotation on a requirement.
        </div>
      )}

      {res.rows.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-card border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-page text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">PO number</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Requirement</th>
                  <th className="px-4 py-3 font-medium">OEM</th>
                  <th className="px-4 py-3 font-medium">Delivery deadline</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {res.rows.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-page/60">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/orders/${o.id}`} className="hover:text-primary">
                        {o.po_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{o.customer}</td>
                    <td className="px-4 py-3 text-muted">{o.tender_ref}</td>
                    <td className="px-4 py-3 text-muted">{o.oem_name ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {fmt(o.delivery_deadline)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          statusStyle[o.status] ?? "bg-border/60 text-muted"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {res.rows.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="block rounded-card border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      PO {o.po_number}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {o.customer} · {o.tender_ref}
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                      statusStyle[o.status] ?? "bg-border/60 text-muted"
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <span>{o.oem_name ?? "no OEM"}</span>
                  <span className="tabular-nums">{fmt(o.delivery_deadline)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
