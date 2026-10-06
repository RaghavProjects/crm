import { daysUntil } from "./format";

export type Health =
  | "on_track"
  | "watch"
  | "at_risk"
  | "overdue"
  | "unknown";

export type HealthEval = { code: Health; label: string; reason: string };

export const HEALTH_LABEL: Record<Health, string> = {
  on_track: "On track",
  watch: "Watch",
  at_risk: "At risk",
  overdue: "Overdue",
  unknown: "Unknown",
};

export const HEALTH_RANK: Record<Health, number> = {
  overdue: 0,
  at_risk: 1,
  watch: 2,
  unknown: 3,
  on_track: 4,
};

// Candidate stale threshold (§10): unvalidated records older than this are
// treated as data cleanup, not current executive risk.
export const STALE_AFTER_DAYS = 365;

// One centralised health ruleset — Dashboard, Orders and record pages all use
// this so they cannot disagree. Change only against documented business rules.
export function evaluateHealth(input: {
  delivery: string | null;
  deliveredOn?: string | null;
  complete: boolean;
  staleAfterDays?: number;
}): HealthEval {
  if (!input.delivery) {
    return {
      code: "unknown",
      label: HEALTH_LABEL.unknown,
      reason: "Delivery date missing",
    };
  }
  if (input.deliveredOn && input.deliveredOn <= input.delivery) {
    return {
      code: "on_track",
      label: HEALTH_LABEL.on_track,
      reason: "Delivered on or before the committed date",
    };
  }
  const d = daysUntil(input.delivery);
  if (d < 0) {
    const overdueDays = -d;
    const stale = input.staleAfterDays ?? STALE_AFTER_DAYS;
    if (overdueDays > stale) {
      return {
        code: "unknown",
        label: HEALTH_LABEL.unknown,
        reason: `Overdue by ${overdueDays} days — validate (possible historical record)`,
      };
    }
    return {
      code: "overdue",
      label: HEALTH_LABEL.overdue,
      reason: `Overdue by ${overdueDays} days`,
    };
  }
  if (!input.complete) {
    if (d <= 7)
      return {
        code: "at_risk",
        label: HEALTH_LABEL.at_risk,
        reason: `Due in ${d} day${d === 1 ? "" : "s"} — fulfilment incomplete`,
      };
    if (d <= 14)
      return {
        code: "watch",
        label: HEALTH_LABEL.watch,
        reason: `Due in ${d} days — fulfilment incomplete`,
      };
  }
  return {
    code: "on_track",
    label: HEALTH_LABEL.on_track,
    reason: "No overdue milestones",
  };
}

export function contractHealth(input: {
  delivery: string | null;
  deliveredOn?: string | null;
  complete: boolean;
}): Health {
  return evaluateHealth(input).code;
}
