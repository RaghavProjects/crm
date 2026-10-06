import { supabaseAdmin } from "./supabase/admin";
import { STEPS } from "./fulfilment";

export type OpenOrderState = {
  id: string;
  po_number: string;
  stage: string;
};

export type Dashboard = {
  openRequirements: number;
  quotesAwaitingResponse: { id: string; tender_ref: string; customer: string }[];
  wonThisMonth: number;
  lostThisMonth: number;
  openOrders: OpenOrderState[];
  ordersAtRisk: { id: string; po_number: string; deadline: string | null }[];
  paymentsOutstanding: number;
  oemResponsesPending: number;
  documentsExpiring: { id: string; title: string; expiry_date: string | null }[];
};

export type DashboardResult =
  | { ok: true; data: Dashboard }
  | { ok: false; error: string };

const DAY = 86_400_000;

function monthStartISO() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

const stepLabel = new Map(STEPS.map((s, i) => [s.code, { label: s.label, sort: i }]));

export async function getDashboard(): Promise<DashboardResult> {
  try {
    const db = supabaseAdmin();
    const [reqs, orders, steps, invoices, payments, sourcing, docs] =
      await Promise.all([
        db.from("requirements").select("id,tender_ref,customer,status,updated_at"),
        db.from("orders").select("id,po_number,status,delivery_deadline"),
        db
          .from("order_fulfilment_steps")
          .select("order_id,step,expected_date,completed_on,sort_order"),
        db.from("order_invoices").select("id,amount"),
        db.from("payments").select("invoice_id,amount"),
        db.from("requirement_oems").select("id").eq("status", "requested"),
        db.from("documents").select("id,title,expiry_date"),
      ]);

    const firstError =
      reqs.error || orders.error || steps.error || invoices.error ||
      payments.error || sourcing.error || docs.error;
    if (firstError) return { ok: false, error: firstError.message };

    const monthStart = monthStartISO();
    const openStatuses = ["received", "qualifying", "quoted", "submitted"];

    const openRequirements = (reqs.data ?? []).filter((r) =>
      openStatuses.includes(r.status),
    ).length;
    const quotesAwaitingResponse = (reqs.data ?? [])
      .filter((r) => r.status === "submitted")
      .map((r) => ({ id: r.id, tender_ref: r.tender_ref, customer: r.customer }));
    const wonThisMonth = (reqs.data ?? []).filter(
      (r) => r.status === "won" && (r.updated_at ?? "") >= monthStart,
    ).length;
    const lostThisMonth = (reqs.data ?? []).filter(
      (r) => r.status === "lost" && (r.updated_at ?? "") >= monthStart,
    ).length;

    // Per-order: latest completed step (its "state"), and delivered expected date.
    const stageByOrder = new Map<string, { label: string; sort: number }>();
    const expectedByOrder = new Map<string, string>();
    for (const s of steps.data ?? []) {
      if (s.completed_on) {
        const info = stepLabel.get(s.step) ?? { label: s.step, sort: s.sort_order ?? 0 };
        const cur = stageByOrder.get(s.order_id);
        if (!cur || info.sort >= cur.sort) stageByOrder.set(s.order_id, info);
      }
      if (s.step === "delivered" && s.expected_date) {
        expectedByOrder.set(s.order_id, s.expected_date);
      }
    }

    const todayISO = new Date().toISOString().slice(0, 10);
    const openOrdersRaw = (orders.data ?? []).filter((o) => o.status === "open");
    const openOrders: OpenOrderState[] = openOrdersRaw.map((o) => ({
      id: o.id,
      po_number: o.po_number,
      stage: stageByOrder.get(o.id)?.label ?? "Not started",
    }));
    const ordersAtRisk = openOrdersRaw
      .filter((o) => {
        const expected = expectedByOrder.get(o.id);
        if (expected && o.delivery_deadline) return expected > o.delivery_deadline;
        return !!o.delivery_deadline && o.delivery_deadline < todayISO;
      })
      .map((o) => ({ id: o.id, po_number: o.po_number, deadline: o.delivery_deadline }));

    const paidByInvoice = new Map<string, number>();
    for (const p of payments.data ?? []) {
      if (p.invoice_id) {
        paidByInvoice.set(
          p.invoice_id,
          (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount),
        );
      }
    }
    const paymentsOutstanding = (invoices.data ?? []).reduce((sum, inv) => {
      const bal = (Number(inv.amount) || 0) - (paidByInvoice.get(inv.id) ?? 0);
      return sum + Math.max(0, bal);
    }, 0);

    const horizon = new Date(Date.now() + 90 * DAY).toISOString().slice(0, 10);
    const documentsExpiring = (docs.data ?? [])
      .filter((d) => d.expiry_date && d.expiry_date <= horizon)
      .map((d) => ({ id: d.id, title: d.title, expiry_date: d.expiry_date }));

    return {
      ok: true,
      data: {
        openRequirements,
        quotesAwaitingResponse,
        wonThisMonth,
        lostThisMonth,
        openOrders,
        ordersAtRisk,
        paymentsOutstanding,
        oemResponsesPending: (sourcing.data ?? []).length,
        documentsExpiring,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
