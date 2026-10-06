import { supabaseAdmin } from "./supabase/admin";

export const STEPS = [
  { code: "oem_po", label: "OEM PO placed" },
  { code: "production_started", label: "Production started" },
  { code: "production_done", label: "Production done" },
  { code: "material_readiness", label: "Material readiness" },
  { code: "pdi_scheduled", label: "PDI scheduled" },
  { code: "pdi_passed", label: "PDI passed" },
  { code: "govt_inspection", label: "Government inspection" },
  { code: "dispatch", label: "Dispatch" },
  { code: "delivered", label: "Delivered" },
  { code: "accepted", label: "Accepted" },
];

export type StepRow = {
  step: string;
  label: string;
  owner: string | null;
  expected_date: string | null;
  completed_on: string | null;
  notes: string | null;
};

export type PdiRow = {
  id: string;
  inspected_on: string | null;
  qty_offered: number | null;
  qty_cleared: number | null;
  qty_rejected: number | null;
  result: string;
  remarks: string | null;
};

export type DeliveryRow = {
  id: string;
  delivered_on: string | null;
  qty_delivered: number;
  status: string;
  notes: string | null;
};

export type Fulfilment = {
  steps: StepRow[];
  pdi: PdiRow[];
  deliveries: DeliveryRow[];
  pdiBlocked: boolean;
  deliveredQty: number;
};

export type FulfilmentResult =
  | { ok: true; data: Fulfilment }
  | { ok: false; error: string };

const num = (v: unknown) => (v == null ? null : Number(v));

export async function listFulfilment(orderId: string): Promise<FulfilmentResult> {
  try {
    const db = supabaseAdmin();
    const [stepsQ, pdiQ, delivQ] = await Promise.all([
      db
        .from("order_fulfilment_steps")
        .select("step,owner,expected_date,completed_on,notes")
        .eq("order_id", orderId),
      db
        .from("order_pdi")
        .select("id,inspected_on,qty_offered,qty_cleared,qty_rejected,result,remarks")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false }),
      db
        .from("order_deliveries")
        .select("id,delivered_on,qty_delivered,status,notes")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true }),
    ]);

    if (stepsQ.error) return { ok: false, error: stepsQ.error.message };
    if (pdiQ.error) return { ok: false, error: pdiQ.error.message };
    if (delivQ.error) return { ok: false, error: delivQ.error.message };

    const saved = new Map((stepsQ.data ?? []).map((s) => [s.step, s]));
    const steps: StepRow[] = STEPS.map((s) => {
      const r = saved.get(s.code);
      return {
        step: s.code,
        label: s.label,
        owner: r?.owner ?? null,
        expected_date: r?.expected_date ?? null,
        completed_on: r?.completed_on ?? null,
        notes: r?.notes ?? null,
      };
    });

    const pdi: PdiRow[] = (pdiQ.data ?? []).map((p) => ({
      id: p.id,
      inspected_on: p.inspected_on,
      qty_offered: num(p.qty_offered),
      qty_cleared: num(p.qty_cleared),
      qty_rejected: num(p.qty_rejected),
      result: p.result,
      remarks: p.remarks,
    }));

    const deliveries: DeliveryRow[] = (delivQ.data ?? []).map((d) => ({
      id: d.id,
      delivered_on: d.delivered_on,
      qty_delivered: Number(d.qty_delivered),
      status: d.status,
      notes: d.notes,
    }));

    const pdiBlocked = pdi.length > 0 && ["failed", "held"].includes(pdi[0].result);
    const deliveredQty = deliveries
      .filter((d) => d.status === "delivered")
      .reduce((s, d) => s + d.qty_delivered, 0);

    return { ok: true, data: { steps, pdi, deliveries, pdiBlocked, deliveredQty } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type MutateResult = { ok: true } | { ok: false; error: string };

export async function updateStep(
  orderId: string,
  step: string,
  input: { owner?: string; expected_date?: string; completed_on?: string; notes?: string },
): Promise<MutateResult> {
  const def = STEPS.find((s) => s.code === step);
  if (!def) return { ok: false, error: "Unknown fulfilment step." };

  if (step === "dispatch" && input.completed_on?.trim()) {
    const f = await listFulfilment(orderId);
    if (f.ok && f.data.pdiBlocked) {
      return {
        ok: false,
        error: "Dispatch is on hold — the latest PDI was failed or held.",
      };
    }
  }

  try {
    const sort = STEPS.findIndex((s) => s.code === step);
    const { error } = await supabaseAdmin()
      .from("order_fulfilment_steps")
      .upsert(
        {
          order_id: orderId,
          step,
          owner: input.owner?.trim() || null,
          expected_date: input.expected_date?.trim() || null,
          completed_on: input.completed_on?.trim() || null,
          notes: input.notes?.trim() || null,
          sort_order: sort,
        },
        { onConflict: "order_id,step" },
      );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const PDI_RESULTS = ["pending", "passed", "failed", "held"];

export async function addPdi(
  orderId: string,
  input: {
    inspected_on?: string;
    qty_offered?: string;
    qty_cleared?: string;
    qty_rejected?: string;
    result?: string;
    remarks?: string;
  },
): Promise<MutateResult> {
  const result = input.result ?? "pending";
  if (!PDI_RESULTS.includes(result)) {
    return { ok: false, error: "Invalid PDI result." };
  }
  for (const [k, label] of [
    ["qty_offered", "offered"],
    ["qty_cleared", "cleared"],
    ["qty_rejected", "rejected"],
  ] as const) {
    const v = input[k]?.trim();
    if (v && (Number.isNaN(Number(v)) || Number(v) < 0)) {
      return { ok: false, error: `PDI quantity ${label} must be a number ≥ 0.` };
    }
  }

  try {
    const { error } = await supabaseAdmin()
      .from("order_pdi")
      .insert({
        order_id: orderId,
        inspected_on: input.inspected_on?.trim() || null,
        qty_offered: input.qty_offered?.trim() ? Number(input.qty_offered) : null,
        qty_cleared: input.qty_cleared?.trim() ? Number(input.qty_cleared) : null,
        qty_rejected: input.qty_rejected?.trim() ? Number(input.qty_rejected) : null,
        result,
        remarks: input.remarks?.trim() || null,
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const DELIVERY_STATUSES = ["in_transit", "delivered"];

export async function addDelivery(
  orderId: string,
  input: { delivered_on?: string; qty_delivered?: string; status?: string; notes?: string },
): Promise<MutateResult> {
  const qty = input.qty_delivered?.trim();
  if (!qty || Number.isNaN(Number(qty)) || Number(qty) <= 0) {
    return { ok: false, error: "Delivered quantity must be greater than zero." };
  }
  const status = input.status ?? "delivered";
  if (!DELIVERY_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid delivery status." };
  }

  try {
    const { error } = await supabaseAdmin()
      .from("order_deliveries")
      .insert({
        order_id: orderId,
        delivered_on: input.delivered_on?.trim() || null,
        qty_delivered: Number(qty),
        status,
        notes: input.notes?.trim() || null,
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
