"use client";

import { useState } from "react";
import { createQuoteAction } from "./actions";

type QuoteLineInput = {
  description: string;
  quantity: string;
};

const input =
  "w-full rounded-control border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary";

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

export function QuoteForm({
  requirementId,
  lines,
}: {
  requirementId: string;
  lines: QuoteLineInput[];
}) {
  const [target, setTarget] = useState("10");
  const [rows, setRows] = useState(
    lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      oem_price: "",
      lead_time_days: "",
      margin_pct: "",
    })),
  );
  const [notes, setNotes] = useState("");

  function update(i: number, key: "oem_price" | "lead_time_days" | "margin_pct", value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }

  const recommended = rows.map((r) => {
    const price = Number(r.oem_price) || 0;
    const margin = Number(r.margin_pct) || 0;
    return Math.round(price * (1 + margin / 100) * 100) / 100;
  });
  const total = rows.reduce(
    (s, r, i) => s + recommended[i] * (Number(r.quantity) || 0),
    0,
  );

  return (
    <form action={createQuoteAction} className="space-y-4">
      <input type="hidden" name="requirement_id" value={requirementId} />
      <input type="hidden" name="quote_lines" value={JSON.stringify(rows)} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-2 pr-3 font-medium">Description</th>
              <th className="py-2 pr-3 font-medium">Qty</th>
              <th className="py-2 pr-3 font-medium">OEM price</th>
              <th className="py-2 pr-3 font-medium">Lead (d)</th>
              <th className="py-2 pr-3 font-medium">Margin %</th>
              <th className="py-2 font-medium">Recommended</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-2 pr-3">{r.description}</td>
                <td className="py-2 pr-3 text-muted">
                  {r.quantity || "—"}
                </td>
                <td className="py-2 pr-3">
                  <input
                    aria-label={`OEM price ${r.description}`}
                    inputMode="decimal"
                    value={r.oem_price}
                    onChange={(e) => update(i, "oem_price", e.target.value)}
                    className={input}
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    aria-label={`Lead time ${r.description}`}
                    inputMode="numeric"
                    value={r.lead_time_days}
                    onChange={(e) => update(i, "lead_time_days", e.target.value)}
                    className={input}
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    aria-label={`Margin ${r.description}`}
                    inputMode="decimal"
                    placeholder={target}
                    value={r.margin_pct}
                    onChange={(e) => update(i, "margin_pct", e.target.value)}
                    className={input}
                  />
                </td>
                <td className="py-2 tabular-nums text-muted">
                  {inr(recommended[i])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-muted" htmlFor="target_margin_pct">
            Target margin %
          </label>
          <input
            id="target_margin_pct"
            name="target_margin_pct"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className={`${input} w-28`}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted" htmlFor="notes">
            Notes
          </label>
          <input
            id="notes"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={input}
          />
        </div>
        <div className="text-sm">
          <span className="text-muted">Recommended total: </span>
          <span className="font-semibold tabular-nums">₹{inr(total)}</span>
        </div>
        <button
          type="submit"
          className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Save draft
        </button>
      </div>
      <p className="text-xs text-muted">
        The recommended price is a suggestion from OEM price and margin — never
        the final bid. Approve it as a separate step.
      </p>
    </form>
  );
}
