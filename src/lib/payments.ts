import { supabaseAdmin } from "./supabase/admin";

export type MutateResult = { ok: true } | { ok: false; error: string };

export type PaymentRow = {
  id: string;
  invoice_id: string | null;
  amount: number;
  paid_on: string | null;
  mode: string | null;
  reference: string | null;
  notes: string | null;
};

export type PaymentsResult =
  | { ok: true; rows: PaymentRow[] }
  | { ok: false; error: string; rows: [] };

export async function listPayments(orderId: string): Promise<PaymentsResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("payments")
      .select("id,invoice_id,amount,paid_on,mode,reference,notes")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message, rows: [] };
    return {
      ok: true,
      rows: (data ?? []).map((p) => ({ ...p, amount: Number(p.amount) })),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      rows: [],
    };
  }
}

export type NewPayment = {
  invoice_id?: string;
  amount: string;
  paid_on?: string;
  mode?: string;
  reference?: string;
  notes?: string;
};

// Partial payments are normal; amount must be > 0.
export async function addPayment(
  orderId: string,
  input: NewPayment,
): Promise<MutateResult> {
  const amount = input.amount?.trim();
  if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
    return { ok: false, error: "Payment amount must be greater than zero." };
  }
  try {
    const { error } = await supabaseAdmin()
      .from("payments")
      .insert({
        order_id: orderId,
        invoice_id: input.invoice_id?.trim() || null,
        amount: Number(amount),
        paid_on: input.paid_on?.trim() || null,
        mode: input.mode?.trim() || null,
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type CommissionRow = {
  id: string;
  oem_name: string | null;
  base_amount: number;
  commission_pct: number | null;
  commission_amount: number | null;
  milestone: string;
  status: string;
  earned_on: string | null;
  notes: string | null;
};

export type CommissionResult =
  | { ok: true; rows: CommissionRow[] }
  | { ok: false; error: string; rows: [] };

export async function listCommission(orderId: string): Promise<CommissionResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("commission_entries")
      .select(
        "id,base_amount,commission_pct,commission_amount,milestone,status,earned_on,notes,oems(name)",
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message, rows: [] };
    return {
      ok: true,
      rows: (data ?? []).map((c) => {
        const oem = Array.isArray(c.oems) ? c.oems[0] : c.oems;
        return {
          id: c.id,
          oem_name: oem?.name ?? null,
          base_amount: Number(c.base_amount),
          commission_pct: c.commission_pct == null ? null : Number(c.commission_pct),
          commission_amount:
            c.commission_amount == null ? null : Number(c.commission_amount),
          milestone: c.milestone,
          status: c.status,
          earned_on: c.earned_on,
          notes: c.notes,
        };
      }),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      rows: [],
    };
  }
}

export type NewCommission = {
  oem_id?: string;
  base_amount: string;
  commission_pct?: string;
  notes?: string;
};

export async function createCommission(
  orderId: string,
  input: NewCommission,
): Promise<MutateResult> {
  const base = input.base_amount?.trim();
  if (!base || Number.isNaN(Number(base)) || Number(base) < 0) {
    return { ok: false, error: "Base amount must be a number ≥ 0." };
  }
  const pct = input.commission_pct?.trim();
  if (pct && Number.isNaN(Number(pct))) {
    return { ok: false, error: "Commission % must be a number." };
  }
  const commissionAmount = pct
    ? Math.round((Number(base) * Number(pct)) / 100 * 100) / 100
    : null;

  try {
    const { error } = await supabaseAdmin()
      .from("commission_entries")
      .insert({
        order_id: orderId,
        oem_id: input.oem_id?.trim() || null,
        base_amount: Number(base),
        commission_pct: pct ? Number(pct) : null,
        commission_amount: commissionAmount,
        notes: input.notes?.trim() || null,
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function setCommissionStatus(
  id: string,
  status: string,
): Promise<MutateResult> {
  if (!["pending", "earned", "paid"].includes(status)) {
    return { ok: false, error: "Invalid commission status." };
  }
  try {
    const { error } = await supabaseAdmin()
      .from("commission_entries")
      .update({
        status,
        earned_on:
          status === "earned" || status === "paid"
            ? new Date().toISOString().slice(0, 10)
            : null,
      })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
