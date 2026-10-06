import { listPaymentsBoard } from "@/lib/boards";
import { PaymentsTable } from "@/components/PaymentsTable";
import { inrCompact } from "@/lib/format";

export default async function PaymentsPage() {
  const res = await listPaymentsBoard();

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div>
        <span className="label">Operations</span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted">
          Receivables and payment management.
        </p>
      </div>

      {res.ok && (
        <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4 border-y border-border py-5">
          <div>
            <div className="label">Receivable</div>
            <div className="mt-1 text-[30px] font-semibold tracking-tight">
              {inrCompact(res.outstanding)}
            </div>
          </div>
          <div>
            <div className="label">Commission not yet paid</div>
            <div className="mt-1 text-[30px] font-semibold tracking-tight">
              {inrCompact(res.commissionPending)}
            </div>
          </div>
        </div>
      )}

      {!res.ok && (
        <div className="panel border-danger/30 bg-critical-tint p-3 text-sm text-danger">
          Payments couldn&apos;t be loaded. {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="panel p-12 text-center text-sm text-muted">No invoices yet.</div>
      )}

      {res.ok && res.rows.length > 0 && <PaymentsTable rows={res.rows} />}
    </div>
  );
}
