import Link from "next/link";
import { listOrdersBoard } from "@/lib/ordersBoard";
import { OrdersTable } from "@/components/OrdersTable";
import { plural } from "@/lib/format";

export default async function OrdersPage() {
  const res = await listOrdersBoard();

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="label">Operations</span>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-muted">
            {res.ok ? plural(res.rows.length, "order") : "Order management"}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          + New order
        </Link>
      </div>

      {!res.ok && (
        <div className="panel border-danger/30 bg-critical-tint p-3 text-sm text-danger">
          Orders couldn&apos;t be loaded. Your other CRM data is still available. {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="panel p-10 text-center text-sm text-muted">
          No orders yet — approve a quotation and convert it to an order from a
          requirement.
        </div>
      )}

      {res.ok && res.rows.length > 0 && (
        <OrdersTable rows={res.rows} variant="orders" />
      )}
    </div>
  );
}
