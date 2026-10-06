import { supabaseAdmin } from "./supabase/admin";
import { STEPS } from "./fulfilment";

export type OpenOrderState = { id: string; po_number: string; stage: string };
export type NamedValue = { name: string; value: number; orders: number };

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
  // Extended
  kpis: {
    conversionPct: number | null;
    deliveryAdherencePct: number | null;
    avgTurnaroundDays: number | null;
    repeatClients: number;
  };
  revenueByOem: NamedValue[];
  revenueByClient: NamedValue[];
  monthlyTrend: { month: string; value: number }[];
  payments: { pendingAmount: number; overdueAmount: number; overdueCount: number };
  commissionReceivable: number;
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
    const [reqs, orders, steps, invoices, payments, sourcing, docs, quotes, comm] =
      await Promise.all([
        db.from("requirements").select("id,tender_ref,customer,status,updated_at,created_at"),
        db
          .from("orders")
          .select(
            "id,po_number,status,delivery_deadline,created_at,oems(name),requirements(customer),quotes(quote_lines(recommended_price,quantity))",
          ),
        db.from("order_fulfilment_steps").select("order_id,step,expected_date,completed_on,sort_order"),
        db.from("order_invoices").select("id,amount,invoice_date"),
        db.from("payments").select("invoice_id,amount"),
        db.from("requirement_oems").select("id").eq("status", "requested"),
        db.from("documents").select("id,title,expiry_date"),
        db.from("quotes").select("id,created_at,requirements(created_at)"),
        db.from("commission_entries").select("commission_amount,status"),
      ]);

    const firstError =
      reqs.error || orders.error || steps.error || invoices.error ||
      payments.error || sourcing.error || docs.error || quotes.error || comm.error;
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

    const wonAll = (reqs.data ?? []).filter((r) => r.status === "won").length;
    const lostAll = (reqs.data ?? []).filter((r) => r.status === "lost").length;
    const conversionPct =
      wonAll + lostAll > 0 ? Math.round((wonAll / (wonAll + lostAll)) * 100) : null;

    const byCustomer = new Map<string, number>();
    for (const r of reqs.data ?? []) {
      byCustomer.set(r.customer, (byCustomer.get(r.customer) ?? 0) + 1);
    }
    const repeatClients = [...byCustomer.values()].filter((n) => n > 1).length;

    const stageByOrder = new Map<string, { label: string; sort: number }>();
    const expectedByOrder = new Map<string, string>();
    const deliveredOn = new Map<string, string>();
    for (const s of steps.data ?? []) {
      if (s.completed_on) {
        const info = stepLabel.get(s.step) ?? { label: s.step, sort: s.sort_order ?? 0 };
        const cur = stageByOrder.get(s.order_id);
        if (!cur || info.sort >= cur.sort) stageByOrder.set(s.order_id, info);
      }
      if (s.step === "delivered") {
        if (s.expected_date) expectedByOrder.set(s.order_id, s.expected_date);
        if (s.completed_on) deliveredOn.set(s.order_id, s.completed_on);
      }
    }

    const todayISO = new Date().toISOString().slice(0, 10);
    const ordersAll = orders.data ?? [];
    const openOrdersRaw = ordersAll.filter((o) => o.status === "open");
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

    // Order value = sum of its quote lines (recommended × qty)
    const orderValue = new Map<string, number>();
    const oemOf = new Map<string, string>();
    const clientOf = new Map<string, string>();
    for (const o of ordersAll) {
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
      orderValue.set(o.id, value);
      oemOf.set(o.id, oem?.name ?? "—");
      clientOf.set(o.id, req?.customer ?? "—");
    }

    const group = (keyOf: (id: string) => string): NamedValue[] => {
      const m = new Map<string, { value: number; orders: number }>();
      for (const o of ordersAll) {
        const k = keyOf(o.id);
        const cur = m.get(k) ?? { value: 0, orders: 0 };
        cur.value += orderValue.get(o.id) ?? 0;
        cur.orders += 1;
        m.set(k, cur);
      }
      return [...m.entries()]
        .map(([name, v]) => ({ name, value: v.value, orders: v.orders }))
        .sort((a, b) => b.value - a.value);
    };
    const revenueByOem = group((id) => oemOf.get(id) ?? "—");
    const revenueByClient = group((id) => clientOf.get(id) ?? "—");

    // Monthly trend, last 6 months
    const monthlyTrend: { month: string; value: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = d.toISOString().slice(0, 7);
      const value = ordersAll
        .filter((o) => (o.created_at ?? "").slice(0, 7) === key)
        .reduce((s, o) => s + (orderValue.get(o.id) ?? 0), 0);
      monthlyTrend.push({ month: key, value });
    }

    // Delivery adherence: delivered orders completed on/before deadline
    let deliveredTotal = 0;
    let deliveredOnTime = 0;
    for (const o of ordersAll) {
      const done = deliveredOn.get(o.id);
      if (done && o.delivery_deadline) {
        deliveredTotal += 1;
        if (done <= o.delivery_deadline) deliveredOnTime += 1;
      }
    }
    const deliveryAdherencePct =
      deliveredTotal > 0 ? Math.round((deliveredOnTime / deliveredTotal) * 100) : null;

    // Average quotation turnaround (requirement → quote), in days
    const turnarounds: number[] = [];
    for (const q of quotes.data ?? []) {
      const req = Array.isArray(q.requirements) ? q.requirements[0] : q.requirements;
      if (req?.created_at && q.created_at) {
        turnarounds.push(
          (new Date(q.created_at).getTime() - new Date(req.created_at).getTime()) / DAY,
        );
      }
    }
    const avgTurnaroundDays =
      turnarounds.length > 0
        ? Math.round((turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length) * 10) / 10
        : null;

    const paidByInvoice = new Map<string, number>();
    for (const p of payments.data ?? []) {
      if (p.invoice_id) {
        paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount));
      }
    }
    const overdueBefore = new Date(Date.now() - 30 * DAY).toISOString().slice(0, 10);
    let paymentsOutstanding = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    for (const inv of invoices.data ?? []) {
      const bal = Math.max(0, (Number(inv.amount) || 0) - (paidByInvoice.get(inv.id) ?? 0));
      if (bal <= 0) continue;
      paymentsOutstanding += bal;
      if (inv.invoice_date && inv.invoice_date < overdueBefore) {
        overdueAmount += bal;
        overdueCount += 1;
      } else {
        pendingAmount += bal;
      }
    }

    const commissionReceivable = (comm.data ?? [])
      .filter((c) => c.status !== "paid")
      .reduce((s, c) => s + (Number(c.commission_amount) || 0), 0);

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
        kpis: { conversionPct, deliveryAdherencePct, avgTurnaroundDays, repeatClients },
        revenueByOem,
        revenueByClient,
        monthlyTrend,
        payments: { pendingAmount, overdueAmount, overdueCount },
        commissionReceivable,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
