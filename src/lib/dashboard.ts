import { supabaseAdmin } from "./supabase/admin";

export type Dashboard = {
  openRequirements: number;
  wonThisMonth: number;
  lostThisMonth: number;
  openOrders: number;
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

export async function getDashboard(): Promise<DashboardResult> {
  try {
    const db = supabaseAdmin();
    const [reqs, orders, steps, invoices, payments, sourcing, docs] =
      await Promise.all([
        db.from("requirements").select("id,status,updated_at"),
        db.from("orders").select("id,po_number,status,delivery_deadline"),
        db.from("order_fulfilment_steps").select("order_id,expected_date").eq("step", "delivered"),
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
    const wonThisMonth = (reqs.data ?? []).filter(
      (r) => r.status === "won" && (r.updated_at ?? "") >= monthStart,
    ).length;
    const lostThisMonth = (reqs.data ?? []).filter(
      (r) => r.status === "lost" && (r.updated_at ?? "") >= monthStart,
    ).length;

    const expectedByOrder = new Map<string, string>();
    for (const s of steps.data ?? []) {
      if (s.expected_date) expectedByOrder.set(s.order_id, s.expected_date);
    }
    const todayISO = new Date().toISOString().slice(0, 10);
    const openOrders = (orders.data ?? []).filter((o) => o.status === "open");
    const ordersAtRisk = openOrders
      .filter((o) => {
        const expected = expectedByOrder.get(o.id);
        if (expected && o.delivery_deadline) return expected > o.delivery_deadline;
        return !!o.delivery_deadline && o.delivery_deadline < todayISO;
      })
      .map((o) => ({
        id: o.id,
        po_number: o.po_number,
        deadline: o.delivery_deadline,
      }));

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
        wonThisMonth,
        lostThisMonth,
        openOrders: openOrders.length,
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
