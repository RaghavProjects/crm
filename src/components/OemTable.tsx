"use client";

import { useMemo, useState } from "react";
import { StatusPill } from "./ui";
import { plural } from "@/lib/format";
import type { OemRow } from "@/lib/oems";

export function OemTable({ rows }: { rows: OemRow[] }) {
  const [q, setQ] = useState("");
  const [approvedOnly, setApprovedOnly] = useState(false);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => (approvedOnly ? r.approved : true))
      .filter((r) =>
        term ? [r.name, r.location ?? "", r.products ?? ""].join(" ").toLowerCase().includes(term) : true,
      );
  }, [rows, q, approvedOnly]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={approvedOnly}
            onChange={(e) => setApprovedOnly(e.target.checked)}
          />
          Approved only
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search OEMs…"
          aria-label="Search OEMs"
          className="ml-auto w-56 rounded-control border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">No OEMs match.</p>
      ) : (
        <div className="overflow-x-auto panel">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border">
                <th className="label px-4 py-2.5 font-medium">OEM</th>
                <th className="label px-4 py-2.5 font-medium">Location</th>
                <th className="label px-4 py-2.5 font-medium">Products</th>
                <th className="label px-4 py-2.5 text-right font-medium">Lead time</th>
                <th className="label px-4 py-2.5 text-right font-medium">Commission</th>
                <th className="label px-4 py-2.5 font-medium">Approved</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-page/60">
                  <td className="px-4 py-3 font-medium">{o.name}</td>
                  <td className="px-4 py-3 text-muted">{o.location ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{o.products ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-[13px]">
                    {o.lead_time_days != null ? `${o.lead_time_days} d` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[13px]">
                    {o.commission_pct != null ? `${o.commission_pct}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill kind={o.approved ? "approved" : "pending"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">
        {plural(visible.length, "OEM")} shown
      </p>
    </div>
  );
}
