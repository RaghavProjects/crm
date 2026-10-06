import { listOrdersBoard } from "@/lib/ordersBoard";
import { OrdersTable } from "@/components/OrdersTable";

export default async function FulfilmentPage() {
  const res = await listOrdersBoard();

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div>
        <span className="label">Operations</span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Fulfilment</h1>
        <p className="mt-1 text-sm text-muted">
          Delivery commitments, milestones and health — one centralised ruleset.
        </p>
      </div>

      {!res.ok && (
        <div className="panel border-danger/30 bg-critical-tint p-3 text-sm text-danger">
          Fulfilment couldn&apos;t be loaded. {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="panel p-10 text-center text-sm text-muted">
          No orders in fulfilment yet.
        </div>
      )}

      {res.ok && res.rows.length > 0 && (
        <OrdersTable rows={res.rows} variant="fulfilment" />
      )}
    </div>
  );
}
