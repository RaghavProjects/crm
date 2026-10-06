"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusPill } from "./ui";
import { inrCompact, formatFull } from "@/lib/format";
import type { OrderBoardRow } from "@/lib/ordersBoard";

type Variant = "orders" | "fulfilment";

const dayDiff = (iso: string | null) =>
  iso
    ? Math.round((new Date(`${iso}T00:00:00Z`).getTime() - Date.now()) / 86_400_000)
    : NaN;

function viewsFor(variant: Variant) {
  return variant === "orders"
    ? [
        { key: "all", label: "All", pred: () => true },
        { key: "at_risk", label: "At risk", pred: (r: OrderBoardRow) => r.health === "at_risk" || r.health === "overdue" },
        { key: "overdue", label: "Overdue", pred: (r: OrderBoardRow) => r.health === "overdue" },
        { key: "due_week", label: "Due this week", pred: (r: OrderBoardRow) => { const d = dayDiff(r.deadline); return d >= 0 && d <= 7; } },
        { key: "await_fulfil", label: "Awaiting fulfilment", pred: (r: OrderBoardRow) => !r.delivered && r.status === "open" },
        { key: "await_pay", label: "Awaiting payment", pred: (r: OrderBoardRow) => r.paymentOutstanding > 0 },
        { key: "completed", label: "Completed", pred: (r: OrderBoardRow) => r.delivered },
        { key: "data", label: "Data issues", pred: (r: OrderBoardRow) => r.missingOem || r.missingDate || r.missingValue },
      ]
    : [
        { key: "all", label: "All", pred: () => true },
        { key: "due", label: "Due soon", pred: (r: OrderBoardRow) => r.health === "watch" || r.health === "at_risk" },
        { key: "at_risk", label: "At risk", pred: (r: OrderBoardRow) => r.health === "at_risk" },
        { key: "overdue", label: "Overdue", pred: (r: OrderBoardRow) => r.health === "overdue" },
        { key: "completed", label: "Completed", pred: (r: OrderBoardRow) => r.delivered },
        { key: "data", label: "Missing data", pred: (r: OrderBoardRow) => r.missingOem || r.missingDate || r.missingValue },
      ];
}

export function OrdersTable({
  rows,
  variant,
}: {
  rows: OrderBoardRow[];
  variant: Variant;
}) {
  const views = viewsFor(variant);
  const [view, setView] = useState("all");
  const [q, setQ] = useState("");
  const [dense, setDense] = useState(false);
  const [sort, setSort] = useState<{ key: "po" | "value" | "delivery"; dir: 1 | -1 }>({
    key: "delivery",
    dir: 1,
  });

  const counted = useMemo(
    () => Object.fromEntries(views.map((v) => [v.key, rows.filter(v.pred).length])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  );

  const visible = useMemo(() => {
    const pred = views.find((v) => v.key === view)?.pred ?? (() => true);
    const term = q.trim().toLowerCase();
    return rows
      .filter(pred)
      .filter((r) =>
        term
          ? [r.po_number, r.oem_name ?? "", r.customer, r.tender_ref]
              .join(" ")
              .toLowerCase()
              .includes(term)
          : true,
      )
      .sort((a, b) => {
        if (sort.key === "value") return (a.value - b.value) * sort.dir;
        if (sort.key === "delivery") {
          const av = a.deadline ?? "9999";
          const bv = b.deadline ?? "9999";
          return av < bv ? -sort.dir : av > bv ? sort.dir : 0;
        }
        return a.po_number < b.po_number ? -sort.dir : sort.dir;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, view, q, sort]);

  const pad = dense ? "py-2" : "py-3";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {views.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              aria-pressed={view === v.key}
              className={`rounded-control px-2.5 py-1 text-xs font-medium ${
                view === v.key ? "bg-primary/10 text-primary" : "text-muted hover:bg-page hover:text-ink"
              }`}
            >
              {v.label} <span className="tabular-nums text-muted">{counted[v.key]}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search orders…"
            aria-label="Search orders"
            className="w-44 rounded-control border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setDense((d) => !d)}
            className="rounded-control border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-page hover:text-ink"
            aria-pressed={dense}
          >
            {dense ? "Comfortable" : "Compact"}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">No orders in this view.</p>
      ) : (
        <div className="overflow-x-auto panel">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border">
                <th className="label px-4 py-2.5 font-medium">
                  <button type="button" className="hover:text-ink" onClick={() => setSort((s) => ({ key: "po", dir: s.key === "po" && s.dir === 1 ? -1 : 1 }))}>
                    Order
                  </button>
                </th>
                <th className="label px-4 py-2.5 font-medium">
                  {variant === "orders" ? "OEM / Client" : "Client / OEM"}
                </th>
                <th className="label px-4 py-2.5 text-right font-medium">
                  <button type="button" className="hover:text-ink" onClick={() => setSort((s) => ({ key: "value", dir: s.key === "value" && s.dir === 1 ? -1 : 1 }))}>
                    Value
                  </button>
                </th>
                <th className="label px-4 py-2.5 font-medium">
                  <button type="button" className="hover:text-ink" onClick={() => setSort((s) => ({ key: "delivery", dir: s.key === "delivery" && s.dir === 1 ? -1 : 1 }))}>
                    {variant === "orders" ? "Delivery" : "Committed"}
                  </button>
                </th>
                <th className="label px-4 py-2.5 font-medium">
                  {variant === "orders" ? "Status" : "Next milestone"}
                </th>
                <th className="label px-4 py-2.5 font-medium">Health</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-page/60">
                  <td className={`px-4 ${pad}`}>
                    <Link href={`/orders/${r.id}`} className="font-mono text-[13px] font-medium hover:text-primary">
                      {r.po_number}
                    </Link>
                  </td>
                  <td className={`px-4 ${pad} text-muted`}>
                    {variant === "orders" ? (
                      <>
                        {r.missingOem ? "—" : r.oem_name}
                        <span className="text-muted/70"> · {r.customer}</span>
                      </>
                    ) : (
                      <>
                        {r.customer}
                        <span className="text-muted/70"> · {r.missingOem ? "—" : r.oem_name}</span>
                      </>
                    )}
                  </td>
                  <td className={`px-4 ${pad} text-right font-mono text-[13px]`}>
                    {r.missingValue ? "—" : inrCompact(r.value)}
                  </td>
                  <td className={`px-4 ${pad} font-mono text-[13px]`}>
                    {r.deadline ? formatFull(r.deadline) : r.health === "unknown" ? "missing" : "—"}
                  </td>
                  <td className={`px-4 ${pad}`}>
                    {variant === "orders" ? (
                      <StatusPill kind={r.stage === "Not started" ? "not_started" : "in_progress"} label={r.stage} />
                    ) : (
                      <span className="text-muted">{r.nextMilestone}</span>
                    )}
                  </td>
                  <td className={`px-4 ${pad}`}>
                    <StatusPill kind={r.health} />
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
