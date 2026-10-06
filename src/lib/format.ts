// Centralised formatting — one source of truth for currency and dates.

const DAY = 86_400_000;

// Full Indian grouping, e.g. ₹6,73,83,120 — tables, records, exports.
export function inrFull(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// Compact Indian notation — dashboard summaries: Cr / L / K.
export function inrCompact(n: number): string {
  const v = Math.round(n);
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(2)} L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)} K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

export function formatShort(dateISO: string | null): string {
  if (!dateISO) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateISO}T00:00:00Z`));
}

export function formatFull(dateISO: string | null): string {
  if (!dateISO) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateISO}T00:00:00Z`));
}

export function daysUntil(dateISO: string): number {
  return Math.round(
    (new Date(`${dateISO}T00:00:00Z`).getTime() - Date.now()) / DAY,
  );
}

// Natural singular/plural — never "order(s)" in user-facing copy.
export function plural(
  n: number,
  singular: string,
  pluralForm?: string,
): string {
  return `${n} ${n === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

// Relative due text. Never returns a negative string for historical records.
export function relativeDue(
  dateISO: string | null,
  opts: { active: boolean },
): { text: string; kind: "future" | "today" | "overdue" | "missing" | "past" } {
  if (!dateISO) return { text: "Delivery date missing", kind: "missing" };
  const d = daysUntil(dateISO);
  if (d > 0)
    return { text: `Due in ${d} day${d === 1 ? "" : "s"}`, kind: "future" };
  if (d === 0) return { text: "Due today", kind: "today" };
  if (opts.active)
    return {
      text: `Overdue by ${-d} day${-d === 1 ? "" : "s"}`,
      kind: "overdue",
    };
  return { text: formatFull(dateISO), kind: "past" };
}
