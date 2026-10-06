import { supabaseAdmin } from "./supabase/admin";
import { STEPS } from "./fulfilment";
import { evaluateHealth, type Health } from "./health";

export type OrderBoardRow = {
  id: string;
  po_number: string;
  customer: string;
  tender_ref: string;
  oem_name: string | null;
  value: number;
  deadline: string | null;
  status: string;
  stage: string;
  nextMilestone: string;
  health: Health;
  healthReason: string;
  delivered: boolean;
  missingOem: boolean;
  missingDate: boolean;
  missingValue: boolean;
  paymentOutstanding: number;
};

export type OrdersBoardResult =
  | { ok: true; rows: OrderBoardRow[] }
  | { ok: false; error: string; rows: [] };

export async function listOrdersBoard(): Promise<OrdersBoardResult> {
  try {
    const db = supabaseAdmin();
    const [orders, steps, invoices, payments] = await Promise.all([
      db
        .from("orders")
        .select(
          "id,po_number,status,delivery_deadline,oems(name),requirements(tender_ref,customer),quotes(quote_lines(recommended_price,quantity))",
        )
        .order("created_at", { ascending: false }),
      db.from("order_fulfilment_steps").select("order_id,step,completed_on,sort_order"),
      db.from("order_invoices").select("id,amount,order_id"),
      db.from("payments").select("invoice_id,amount"),
    ]);
    const firstError = orders.error || steps.error || invoices.error || payments.error;
    if (firstError) return { ok: false, error: firstError.message, rows: [] };

    const stepIndex = new Map(STEPS.map((s, i) => [s.code, { label: s.label, sort: i }]));
    const doneByOrder = new Map<string, Set<string>>();
    const deliveredOnByOrder = new Map<string, string>();
    for (const s of steps.data ?? []) {
      if (s.completed_on) {
        const set = doneByOrder.get(s.order_id) ?? new Set<string>();
        set.add(s.step);
        doneByOrder.set(s.order_id, set);
        if (s.step === "delivered") deliveredOnByOrder.set(s.order_id, s.completed_on);
      }
    }

    const paid = new Map<string, number>();
    for (const p of payments.data ?? []) {
      if (p.invoice_id) paid.set(p.invoice_id, (paid.get(p.invoice_id) ?? 0) + Number(p.amount));
    }
    const outstandingByOrder = new Map<string, number>();
    for (const inv of invoices.data ?? []) {
      const bal = Math.max(0, (Number(inv.amount) || 0) - (paid.get(inv.id) ?? 0));
      if (bal > 0) {
        outstandingByOrder.set(inv.order_id, (outstandingByOrder.get(inv.order_id) ?? 0) + bal);
      }
    }

    const rows: OrderBoardRow[] = (orders.data ?? []).map((o) => {
      const oem = Array.isArray(o.oems) ? o.oems[0] : o.oems;
      const req = Array.isArray(o.requirements) ? o.requirements[0] : o.requirements;
      const quote = Array.isArray(o.quotes) ? o.quotes[0] : o.quotes;
      const value = ((quote?.quote_lines ?? []) as {
        recommended_price: number | null;
        quantity: number | null;
      }[]).reduce(
        (s, l) => s + (Number(l.recommended_price) || 0) * (Number(l.quantity) || 0),
        0,
      );

      const done = doneByOrder.get(o.id) ?? new Set<string>();
      let lastLabel = "Not started";
      for (const [code, info] of stepIndex) if (done.has(code)) lastLabel = info.label;
      const delivered = done.has("delivered") || done.has("accepted");
      const complete = done.has("accepted") || delivered;
      const evaluation = evaluateHealth({
        delivery: o.delivery_deadline,
        deliveredOn: deliveredOnByOrder.get(o.id) ?? null,
        complete,
      });
      const next = STEPS.find((s) => !done.has(s.code));

      return {
        id: o.id,
        po_number: o.po_number,
        customer: req?.customer ?? "—",
        tender_ref: req?.tender_ref ?? "—",
        oem_name: oem?.name ?? null,
        value,
        deadline: o.delivery_deadline,
        status: o.status,
        stage: lastLabel,
        nextMilestone: next?.label ?? "Complete",
        health: evaluation.code,
        healthReason: evaluation.reason,
        delivered,
        missingOem: !oem?.name,
        missingDate: !o.delivery_deadline,
        missingValue: value === 0,
        paymentOutstanding: outstandingByOrder.get(o.id) ?? 0,
      };
    });

    return { ok: true, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), rows: [] };
  }
}
