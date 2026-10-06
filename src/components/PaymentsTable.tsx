"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusPill } from "./ui";
import { inrFull } from "@/lib/format";
import type { InvoiceRow } from "@/lib/boards";

const VIEWS = [
  { key: "all", label: "All", pred: () => true },
  { key: "outstanding", label: "Outstanding", pred: (r: InvoiceRow) => r.status === "outstanding" },
  { key: "overdue", label: "Overdue", pred: (r: InvoiceRow) => r.status === "overdue" },
  { key: "paid", label: "Paid", pred: (r: InvoiceRow) => r.status === "paid" },
  { key: "data", label: "Missing data", pred: (r: InvoiceRow) => r.amount == null || !r.invoice_date },
];

export function PaymentsTable({ rows }: { rows: InvoiceRow[] }) {
  const [view, setView] = useState("all");
  const [q, setQ] = useState("");

  const counts = useMemo(
    () => Object.fromEntries(VIEWS.map((v) => [v.key, rows.filter(v.pred).length])),
    [rows],
  );
  const visible = useMemo(() => {
    const pred = VIEWS.find((v) => v.key === view)?.pred ?? (() => true);
    const term = q.trim().toLowerCase();
    return rows.filter(pred).filter((r) =>
      term ? [r.invoice_number, r.po_number, r.tender_ref].join(" ").toLowerCase().includes(term) : true,
    );
  }, [rows, view, q]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              aria-pressed={view === v.key}
              className={`rounded-control px-2.5 py-1 text-xs font-medium ${
                view === v.key ? "bg-primary/10 text-primary" : "text-muted hover:bg-page hover:text-ink"
              }`}
            >
              {v.label} <span className="tabular-nums text-muted">{counts[v.key]}</span>
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search invoices…"
          aria-label="Search invoices"
          className="ml-auto w-48 rounded-control border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">No invoices in this view.</p>
      ) : (
        <div className="overflow-x-auto panel">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border">
                <th className="label px-4 py-2.5 font-medium">Invoice</th>
                <th className="label px-4 py-2.5 font-medium">Order</th>
                <th className="label px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="label px-4 py-2.5 text-right font-medium">Paid</th>
                <th className="label px-4 py-2.5 text-right font-medium">Balance</th>
                <th className="label px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-page/60">
                  <td className="px-4 py-3 font-mono text-[13px]">{r.invoice_number}</td>
                  <td className="px-4 py-3">
                    <Link href={`/orders/${r.order_id}`} className="font-mono text-[13px] hover:text-primary">
                      {r.po_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[13px]">{inrFull(r.amount ?? 0)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] text-muted">{inrFull(r.paid)}</td>
                  <td className={`px-4 py-3 text-right font-mono text-[13px] ${r.balance > 0 ? "text-danger" : "text-success"}`}>
                    {inrFull(r.balance)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill kind={r.status === "paid" ? "completed" : r.status === "overdue" ? "overdue" : "pending"} />
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
