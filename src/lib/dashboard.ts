import { supabaseAdmin } from "./supabase/admin";
import { STEPS } from "./fulfilment";
import { evaluateHealth, type Health } from "./health";

export type OpenOrderState = {
  id: string;
  po_number: string;
  stage: string;
  oem_name: string | null;
  value: number;
  deadline: string | null;
  health: Health;
  healthReason: string;
  missingOem: boolean;
  missingDate: boolean;
  missingValue: boolean;
};
export type ActivityItem = { at: string; message: string; actor: string | null };
export type NamedValue = { name: string; value: number; orders: number };
export type FlowStage = { label: string; count: number; href: string };
export type PipelineStage = {
  label: string;
  count: number;
  value: number | null;
  href: string;
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
  contractFlow: FlowStage[];
  kpis: {
    conversionPct: number | null;
    deliveryAdherencePct: number | null;
    avgTurnaroundDays: number | null;
    repeatClients: number;
    pipelineValue: number;
    activeOrderValue: number;
    atRiskValue: number;
  };
  revenueByOem: NamedValue[];
  revenueByClient: NamedValue[];
  monthlyTrend: { month: string; value: number }[];
  payments: { pendingAmount: number; overdueAmount: number; overdueCount: number };
  commissionReceivable: number;
  recentActivity: ActivityItem[];
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
    const [reqs, orders, steps, invoices, payments, sourcing, docs, quotes, comm, audit] =
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
        db.from("requirement_oems").select("id,status,requirement_id"),
        db.from("documents").select("id,title,expiry_date"),
        db
          .from("quotes")
          .select("id,created_at,requirements(status,created_at),quote_lines(recommended_price,quantity)"),
        db.from("commission_entries").select("commission_amount,status"),
        db
          .from("audit_events")
          .select("at,actor,entity,action")
          .order("at", { ascending: false })
          .limit(8),
      ]);

    const firstError =
      reqs.error || orders.error || steps.error || invoices.error ||
      payments.error || sourcing.error || docs.error || quotes.error ||
      comm.error || audit.error;
    if (firstError) return { ok: false, error: firstError.message };

    const monthStart = monthStartISO();
    const openStatuses = ["received", "qualifying", "quoted", "submitted"];
    const reqRows = reqs.data ?? [];

    const openRequirements = reqRows.filter((r) => openStatuses.includes(r.status)).length;
    const quotesAwaitingResponse = reqRows
      .filter((r) => r.status === "submitted")
      .map((r) => ({ id: r.id, tender_ref: r.tender_ref, customer: r.customer }));
    const wonThisMonth = reqRows.filter(
      (r) => r.status === "won" && (r.updated_at ?? "") >= monthStart,
    ).length;
    const lostThisMonth = reqRows.filter(
      (r) => r.status === "lost" && (r.updated_at ?? "") >= monthStart,
    ).length;
    const wonAll = reqRows.filter((r) => r.status === "won").length;
    const lostAll = reqRows.filter((r) => r.status === "lost").length;
    const receivedCount = reqRows.filter((r) => ["received", "qualifying"].includes(r.status)).length;
    const quotedCount = reqRows.filter((r) => r.status === "quoted").length;
    const conversionPct =
      wonAll + lostAll > 0 ? Math.round((wonAll / (wonAll + lostAll)) * 100) : null;

    const byCustomer = new Map<string, number>();
    for (const r of reqRows) byCustomer.set(r.customer, (byCustomer.get(r.customer) ?? 0) + 1);
    const repeatClients = [...byCustomer.values()].filter((n) => n > 1).length;

    const sourcingRows = sourcing.data ?? [];
    const oemResponsesPending = sourcingRows.filter((s) => s.status === "requested").length;

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

    const ordersAll = orders.data ?? [];
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

    const openOrdersRaw = ordersAll.filter((o) => o.status === "open");
    const openOrders: OpenOrderState[] = openOrdersRaw.map((o) => {
      const stage = stageByOrder.get(o.id)?.label ?? "Not started";
      const value = orderValue.get(o.id) ?? 0;
      const delivered = deliveredOn.get(o.id) ?? null;
      const complete = stage === "Accepted" || !!delivered;
      const evaluation = evaluateHealth({
        delivery: o.delivery_deadline,
        deliveredOn: delivered,
        complete,
      });
      return {
        id: o.id,
        po_number: o.po_number,
        stage,
        oem_name: oemOf.get(o.id) ?? null,
        value,
        deadline: o.delivery_deadline,
        health: evaluation.code,
        healthReason: evaluation.reason,
        missingOem: !oemOf.get(o.id) || oemOf.get(o.id) === "—",
        missingDate: !o.delivery_deadline,
        missingValue: value === 0,
      };
    });

    const ordersAtRisk = openOrders
      .filter((o) => o.health === "at_risk" || o.health === "overdue")
      .map((o) => ({ id: o.id, po_number: o.po_number, deadline: o.deadline }));

    const activeOrderValue = openOrders.reduce((s, o) => s + o.value, 0);
    const atRiskValue = openOrders
      .filter((o) => o.health === "at_risk" || o.health === "overdue")
      .reduce((s, o) => s + o.value, 0);

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

    // Pipeline value = recommended totals of quotations for open requirements.
    let pipelineValue = 0;
    const turnarounds: number[] = [];
    for (const q of quotes.data ?? []) {
      const req = Array.isArray(q.requirements) ? q.requirements[0] : q.requirements;
      const total = ((q.quote_lines ?? []) as {
        recommended_price: number | null;
        quantity: number | null;
      }[]).reduce(
        (s, l) => s + (Number(l.recommended_price) || 0) * (Number(l.quantity) || 0),
        0,
      );
      if (req && openStatuses.includes(req.status)) pipelineValue += total;
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
    let unpaidInvoices = 0;
    for (const inv of invoices.data ?? []) {
      const bal = Math.max(0, (Number(inv.amount) || 0) - (paidByInvoice.get(inv.id) ?? 0));
      if (bal <= 0) continue;
      unpaidInvoices += 1;
      paymentsOutstanding += bal;
      if (inv.invoice_date && inv.invoice_date < overdueBefore) {
        overdueAmount += bal;
        overdueCount += 1;
      } else {
        pendingAmount += bal;
      }
    }

    let deliveredCount = 0;
    for (const o of ordersAll) if (deliveredOn.get(o.id)) deliveredCount += 1;

    const deliveredTotal = deliveredCount;
    const deliveredOnTime = ordersAll.filter((o) => {
      const done = deliveredOn.get(o.id);
      return done && o.delivery_deadline && done <= o.delivery_deadline;
    }).length;
    const deliveryAdherencePct =
      deliveredTotal > 0 ? Math.round((deliveredOnTime / deliveredTotal) * 100) : null;

    const commissionReceivable = (comm.data ?? [])
      .filter((c) => c.status !== "paid")
      .reduce((s, c) => s + (Number(c.commission_amount) || 0), 0);

    const horizon = new Date(Date.now() + 90 * DAY).toISOString().slice(0, 10);
    const documentsExpiring = (docs.data ?? [])
      .filter((d) => d.expiry_date && d.expiry_date <= horizon)
      .map((d) => ({ id: d.id, title: d.title, expiry_date: d.expiry_date }));

    const contractFlow: FlowStage[] = [
      { label: "Requirement", count: receivedCount, href: "/" },
      { label: "Quotation", count: quotedCount, href: "/quotations" },
      { label: "Order", count: ordersAll.length, href: "/orders" },
      { label: "Fulfilment", count: deliveredCount, href: "/fulfilment" },
      { label: "Payment", count: unpaidInvoices, href: "/payments" },
    ];

    const entityLabel: Record<string, string> = {
      requirement: "Requirement",
      oem: "OEM",
      quote: "Quotation",
      order: "Order",
      coverage: "Coverage",
      sourcing: "Sourcing",
      invoice: "Invoice",
      payment: "Payment",
      commission: "Commission",
      document: "Document",
      fulfilment: "Fulfilment",
      pdi: "PDI",
      delivery: "Delivery",
    };
    const humanize = (action: string) => {
      if (action.startsWith("status:")) return `moved to ${action.slice(7)}`;
      if (action.startsWith("step:")) return "fulfilment step updated";
      if (action.startsWith("response:")) return `response ${action.slice(9)}`;
      return action;
    };
    const recentActivity: ActivityItem[] = (audit.data ?? []).map((e) => ({
      at: e.at,
      actor: e.actor,
      message: `${entityLabel[e.entity] ?? e.entity} ${humanize(e.action)}`,
    }));

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
        oemResponsesPending,
        documentsExpiring,
        contractFlow,
        kpis: {
          conversionPct,
          deliveryAdherencePct,
          avgTurnaroundDays,
          repeatClients,
          pipelineValue,
          activeOrderValue,
          atRiskValue,
        },
        revenueByOem,
        revenueByClient,
        monthlyTrend,
        payments: { pendingAmount, overdueAmount, overdueCount },
        commissionReceivable,
        recentActivity,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
