"use client";

import { useMemo, useState } from "react";
import { expiryState } from "@/lib/documents";
import type { DocumentRow } from "@/lib/documents";

const expiryStyle: Record<string, string> = {
  none: "text-muted",
  ok: "text-success",
  soon: "text-warning",
  expired: "text-danger",
};
const expiryLabel: Record<string, string> = {
  none: "No expiry",
  ok: "Valid",
  soon: "Expiring soon",
  expired: "Expired",
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${d}T00:00:00Z`));
}

export function DocumentsTable({ rows }: { rows: DocumentRow[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");

  const types = useMemo(
    () => [...new Set(rows.map((r) => r.doc_type))].sort(),
    [rows],
  );

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => (type === "all" ? true : r.doc_type === type))
      .filter((r) =>
        term
          ? [r.title, r.doc_type, r.supplier ?? "", r.product ?? ""].join(" ").toLowerCase().includes(term)
          : true,
      );
  }, [rows, q, type]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Filter by document type"
          className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
        >
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search documents…"
          aria-label="Search documents"
          className="ml-auto w-56 rounded-control border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">No documents match.</p>
      ) : (
        <div className="overflow-x-auto panel">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border">
                <th className="label px-4 py-2.5 font-medium">Title</th>
                <th className="label px-4 py-2.5 font-medium">Type</th>
                <th className="label px-4 py-2.5 font-medium">Source</th>
                <th className="label px-4 py-2.5 font-medium">Issued</th>
                <th className="label px-4 py-2.5 font-medium">Expiry</th>
                <th className="label px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => {
                const state = expiryState(d.expiry_date);
                return (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-page/60">
                    <td className="px-4 py-3 font-medium">{d.title}</td>
                    <td className="px-4 py-3 text-muted">{d.doc_type}</td>
                    <td className="px-4 py-3 text-muted">{d.supplier ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-muted">{fmt(d.issue_date)}</td>
                    <td className="px-4 py-3 font-mono text-[13px]">{fmt(d.expiry_date)}</td>
                    <td className={`px-4 py-3 text-xs font-medium ${expiryStyle[state]}`}>
                      {expiryLabel[state]}
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
