"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusPill } from "./ui";
import { inrFull } from "@/lib/format";
import type { QuoteRow } from "@/lib/boards";

const VIEWS = [
  { key: "all", label: "All", pred: () => true },
  { key: "draft", label: "Draft", pred: (r: QuoteRow) => r.status === "draft" },
  { key: "approved", label: "Approved", pred: (r: QuoteRow) => r.status === "approved" },
  { key: "data", label: "Data issues", pred: (r: QuoteRow) => !r.requirement_id || r.total === 0 },
];

export function QuotationsTable({ rows }: { rows: QuoteRow[] }) {
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
      term ? [r.tender_ref, r.customer].join(" ").toLowerCase().includes(term) : true,
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
          placeholder="Search quotations…"
          aria-label="Search quotations"
          className="ml-auto w-48 rounded-control border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">No quotations in this view.</p>
      ) : (
        <div className="overflow-x-auto panel">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border">
                <th className="label px-4 py-2.5 font-medium">Tender ref</th>
                <th className="label px-4 py-2.5 font-medium">Customer</th>
                <th className="label px-4 py-2.5 font-medium">Version</th>
                <th className="label px-4 py-2.5 text-right font-medium">Recommended total</th>
                <th className="label px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-page/60">
                  <td className="px-4 py-3">
                    <Link href={`/requirements/${r.requirement_id}`} className="font-mono text-[13px] font-medium hover:text-primary">
                      {r.tender_ref}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{r.customer}</td>
                  <td className="px-4 py-3 text-muted">v{r.version}</td>
                  <td className="px-4 py-3 text-right font-mono text-[13px]">{inrFull(r.total)}</td>
                  <td className="px-4 py-3">
                    <StatusPill kind={r.status} />
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
