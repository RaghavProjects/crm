import Link from "next/link";
import type { ReactNode } from "react";

// --- Status (glyph + text; never colour alone) -----------------------------
const STATUS: Record<string, { glyph: string; label: string; cls: string }> = {
  not_started: { glyph: "○", label: "Not started", cls: "text-muted" },
  in_progress: { glyph: "◉", label: "In progress", cls: "text-info" },
  due_soon: { glyph: "◔", label: "Due soon", cls: "text-warning" },
  on_track: { glyph: "●", label: "On track", cls: "text-success" },
  watch: { glyph: "◔", label: "Watch", cls: "text-warning" },
  overdue: { glyph: "!", label: "Overdue", cls: "text-danger" },
  unknown: { glyph: "?", label: "Unknown", cls: "text-muted" },
  delivered: { glyph: "✓", label: "Delivered", cls: "text-success" },
  at_risk: { glyph: "!", label: "At risk", cls: "text-danger" },
  payment_due: { glyph: "₹", label: "Payment due", cls: "text-warning" },
  approved: { glyph: "✓", label: "Approved", cls: "text-success" },
  draft: { glyph: "○", label: "Draft", cls: "text-muted" },
  pending: { glyph: "○", label: "Pending", cls: "text-muted" },
  passed: { glyph: "✓", label: "Passed", cls: "text-success" },
  held: { glyph: "!", label: "Held", cls: "text-warning" },
  failed: { glyph: "!", label: "Failed", cls: "text-danger" },
  open: { glyph: "◉", label: "Open", cls: "text-info" },
  completed: { glyph: "✓", label: "Completed", cls: "text-success" },
};

export function StatusPill({
  kind,
  label,
}: {
  kind: string;
  label?: string;
}) {
  const s = STATUS[kind] ?? { glyph: "•", label: kind, cls: "text-muted" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.cls}`}>
      <span aria-hidden className="text-[13px] leading-none">
        {s.glyph}
      </span>
      <span className="text-ink">{label ?? s.label}</span>
    </span>
  );
}

// --- Lifecycle indicator ---------------------------------------------------
export const LIFECYCLE = [
  "Requirement",
  "OEM",
  "Quotation",
  "Order",
  "Fulfilment",
  "Payment",
];

export function Lifecycle({ stage }: { stage: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {LIFECYCLE.map((s, i) => (
        <span key={s} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`size-2 rounded-full ${
              i < stage
                ? "bg-primary"
                : i === stage
                  ? "bg-accent ring-2 ring-accent/30"
                  : "bg-border"
            }`}
          />
          <span
            className={
              i === stage
                ? "font-medium text-ink"
                : i < stage
                  ? "text-muted"
                  : "text-muted/60"
            }
          >
            {s}
          </span>
          {i < LIFECYCLE.length - 1 && (
            <span aria-hidden className="mx-1 h-px w-4 bg-border" />
          )}
        </span>
      ))}
    </div>
  );
}

// --- KPI (typographic, no heavy card) --------------------------------------
export function Kpi({
  label,
  value,
  context,
  tone,
}: {
  label: string;
  value: string;
  context?: string;
  tone?: "danger" | "warning" | "success";
}) {
  const toneCls =
    tone === "danger"
      ? "text-danger"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : "text-ink";
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`mt-1 text-[26px] font-semibold tracking-tight ${toneCls}`}>
        {value}
      </div>
      {context && <div className="mt-0.5 text-xs text-muted">{context}</div>}
    </div>
  );
}

// --- Empty state -----------------------------------------------------------
export function EmptyState({
  title,
  hint,
  actionHref,
  actionLabel,
}: {
  title: string;
  hint?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-card border border-border bg-surface px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-4 inline-block rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

// --- Section (heading + hairline rule, not a card) -------------------------
export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border pt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
