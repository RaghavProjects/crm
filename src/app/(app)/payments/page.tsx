import Link from "next/link";
import { listPaymentsBoard } from "@/lib/boards";

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default async function PaymentsPage() {
  const res = await listPaymentsBoard();

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <span className="label">Work</span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
          Payments
        </h1>
        <p className="mt-1 text-sm text-muted">
          Invoices, receipts and commission.
        </p>
      </div>

      {res.ok && (
        <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4 border-y border-border py-5">
          <div>
            <div className="label">Outstanding</div>
            <div className="mt-1 text-[30px] font-semibold tracking-tight text-ink">
              {inr(res.outstanding)}
            </div>
          </div>
          <div>
            <div className="label">Commission not yet paid</div>
            <div className="mt-1 text-[30px] font-semibold tracking-tight text-ink">
              {inr(res.commissionPending)}
            </div>
          </div>
        </div>
      )}

      {!res.ok && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          Could not load payments: {res.error}
        </div>
      )}

      {res.ok && res.rows.length === 0 && (
        <div className="rounded-card border border-border bg-surface p-12 text-center text-sm text-muted">
          No invoices yet.
        </div>
      )}

      {res.rows.length > 0 && (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="label px-4 py-2.5 font-medium">Invoice</th>
                <th className="label px-4 py-2.5 font-medium">PO</th>
                <th className="label px-4 py-2.5 font-medium">Requirement</th>
                <th className="label px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="label px-4 py-2.5 text-right font-medium">Paid</th>
                <th className="label px-4 py-2.5 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {res.rows.map((i) => (
                <tr key={i.id} className="group border-t border-border hover:bg-page/70">
                  <td className="px-4 py-3 font-mono text-[13px]">
                    {i.invoice_number}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/orders/${i.order_id}`}
                      className="font-mono text-[13px] group-hover:text-primary"
                    >
                      {i.po_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted">
                    {i.tender_ref}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[13px]">
                    {inr(i.amount ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] text-muted">
                    {inr(i.paid)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono text-[13px] ${
                      i.balance > 0 ? "text-danger" : "text-success"
                    }`}
                  >
                    {inr(i.balance)}
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
