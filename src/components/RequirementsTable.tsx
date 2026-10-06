"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusPill } from "./ui";
import { formatFull } from "@/lib/format";
import type { RequirementRow } from "@/lib/requirements";

const dayDiff = (iso: string | null) =>
  iso ? Math.round((new Date(`${iso}T00:00:00Z`).getTime() - Date.now()) / 86_400_000) : NaN;

const VIEWS = [
  { key: "all", label: "All", pred: () => true },
  { key: "open", label: "Open", pred: (r: RequirementRow) => ["received", "qualifying", "quoted", "submitted"].includes(r.status) },
  { key: "quoted", label: "Quoted", pred: (r: RequirementRow) => r.status === "quoted" },
  { key: "submitted", label: "Submitted", pred: (r: RequirementRow) => r.status === "submitted" },
  { key: "won", label: "Won", pred: (r: RequirementRow) => r.status === "won" },
  { key: "lost", label: "Lost", pred: (r: RequirementRow) => r.status === "lost" },
  { key: "due", label: "Due ≤ 7 days", pred: (r: RequirementRow) => { const d = dayDiff(r.submission_deadline); return d >= 0 && d <= 7; } },
  { key: "data", label: "Data issues", pred: (r: RequirementRow) => !r.submission_deadline || r.lines === 0 },
];

export function RequirementsTable({ rows }: { rows: RequirementRow[] }) {
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
      term
        ? [r.tender_ref, r.customer, r.project ?? ""].join(" ").toLowerCase().includes(term)
        : true,
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
          placeholder="Search requirements…"
          aria-label="Search requirements"
          className="ml-auto w-48 rounded-control border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">No requirements in this view.</p>
      ) : (
        <div className="overflow-x-auto panel">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border">
                <th className="label px-4 py-2.5 font-medium">Tender ref</th>
                <th className="label px-4 py-2.5 font-medium">Customer</th>
                <th className="label px-4 py-2.5 font-medium">Project</th>
                <th className="label px-4 py-2.5 text-right font-medium">Lines</th>
                <th className="label px-4 py-2.5 font-medium">Deadline</th>
                <th className="label px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-page/60">
                  <td className="px-4 py-3">
                    <Link href={`/requirements/${r.id}`} className="font-mono text-[13px] font-medium hover:text-primary">
                      {r.tender_ref}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{r.customer}</td>
                  <td className="px-4 py-3 text-muted">{r.project ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.lines}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">
                    {r.submission_deadline ? formatFull(r.submission_deadline) : "—"}
                  </td>
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
