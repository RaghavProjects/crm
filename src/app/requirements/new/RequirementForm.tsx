"use client";

import { useState } from "react";
import Link from "next/link";
import { createRequirementAction } from "./actions";

type Line = {
  part_description: string;
  client_part_no: string;
  oem_part_no: string;
  quantity: string;
  unit: string;
  delivery_required: string;
};

const emptyLine: Line = {
  part_description: "",
  client_part_no: "",
  oem_part_no: "",
  quantity: "",
  unit: "",
  delivery_required: "",
};

const input =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";
const label = "block text-xs font-medium text-muted";

export function RequirementForm() {
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);

  function update(i: number, key: keyof Line, value: string) {
    setLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)),
    );
  }

  return (
    <form action={createRequirementAction} className="space-y-6">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      <section className="rounded-card border border-border bg-surface p-4 md:p-6">
        <h2 className="text-sm font-semibold">Requirement</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="tender_ref">
              Tender / enquiry reference *
            </label>
            <input id="tender_ref" name="tender_ref" required className={input} />
          </div>
          <div>
            <label className={label} htmlFor="customer">
              Customer / agency *
            </label>
            <input id="customer" name="customer" required className={input} />
          </div>
          <div>
            <label className={label} htmlFor="project">
              Project
            </label>
            <input id="project" name="project" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="source">
              Source of enquiry
            </label>
            <input
              id="source"
              name="source"
              placeholder="GeM / Client portal / Direct / OEM"
              className={input}
            />
          </div>
          <div>
            <label className={label} htmlFor="submission_deadline">
              Submission deadline
            </label>
            <input
              id="submission_deadline"
              name="submission_deadline"
              type="date"
              className={input}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="notes">
              Notes
            </label>
            <textarea id="notes" name="notes" rows={2} className={input} />
          </div>
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Line items{" "}
            <span className="font-normal text-muted">
              (up to 500 part numbers)
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setLines((p) => [...p, { ...emptyLine }])}
            className="rounded-control border border-border px-3 py-1.5 text-xs font-medium hover:bg-page"
          >
            + Add line
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {lines.map((line, i) => (
            <div
              key={i}
              className="rounded-card border border-border bg-page/60 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">
                  Line {i + 1}
                </span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setLines((p) => p.filter((_, idx) => idx !== i))
                    }
                    className="text-xs font-medium text-danger"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-6">
                <input
                  aria-label="Part description"
                  placeholder="Part description *"
                  value={line.part_description}
                  onChange={(e) => update(i, "part_description", e.target.value)}
                  className={`${input} sm:col-span-3`}
                />
                <input
                  aria-label="Client part number"
                  placeholder="Client part no."
                  value={line.client_part_no}
                  onChange={(e) => update(i, "client_part_no", e.target.value)}
                  className={`${input} sm:col-span-1`}
                />
                <input
                  aria-label="OEM part number"
                  placeholder="OEM part no."
                  value={line.oem_part_no}
                  onChange={(e) => update(i, "oem_part_no", e.target.value)}
                  className={`${input} sm:col-span-1`}
                />
                <input
                  aria-label="Quantity"
                  placeholder="Qty"
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(e) => update(i, "quantity", e.target.value)}
                  className={`${input} sm:col-span-1`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Save requirement
        </button>
        <Link
          href="/"
          className="rounded-control border border-border px-4 py-2 text-sm font-medium hover:bg-page"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
