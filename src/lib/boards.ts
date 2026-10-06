import { supabaseAdmin } from "./supabase/admin";

const STEPS_TOTAL = 10;

// --- Quotations board ------------------------------------------------------
export type QuoteRow = {
  id: string;
  version: number;
  status: string;
  tender_ref: string;
  customer: string;
  requirement_id: string;
  total: number;
  created_at: string;
};

export type QuotesBoardResult =
  | { ok: true; rows: QuoteRow[] }
  | { ok: false; error: string; rows: [] };

export async function listAllQuotes(): Promise<QuotesBoardResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("quotes")
      .select(
        "id,version,status,created_at,requirements(id,tender_ref,customer),quote_lines(recommended_price,quantity)",
      )
      .order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message, rows: [] };

    const rows: QuoteRow[] = (data ?? []).map((q) => {
      const req = Array.isArray(q.requirements) ? q.requirements[0] : q.requirements;
      const lines = (q.quote_lines ?? []) as {
        recommended_price: number | null;
        quantity: number | null;
      }[];
      const total = lines.reduce(
        (s, l) => s + (Number(l.recommended_price) || 0) * (Number(l.quantity) || 0),
        0,
      );
      return {
        id: q.id,
        version: q.version,
        status: q.status,
        tender_ref: req?.tender_ref ?? "—",
        customer: req?.customer ?? "—",
        requirement_id: req?.id ?? "",
        total,
        created_at: q.created_at,
      };
    });
    return { ok: true, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), rows: [] };
  }
}

// --- Fulfilment board ------------------------------------------------------
export type FulfilmentRow = {
  order_id: string;
  po_number: string;
  tender_ref: string;
  customer: string;
  oem_name: string | null;
  deadline: string | null;
  steps_done: number;
  pdi: string | null;
  ordered: number;
  delivered: number;
};

export type FulfilmentBoardResult =
  | { ok: true; rows: FulfilmentRow[] }
  | { ok: false; error: string; rows: [] };

export async function listFulfilmentBoard(): Promise<FulfilmentBoardResult> {
  try {
    const db = supabaseAdmin();
    const [orders, steps, pdi, deliveries] = await Promise.all([
      db
        .from("orders")
        .select(
          "id,po_number,delivery_deadline,status,oems(name),requirements(tender_ref,customer),quotes(quote_lines(quantity))",
        )
        .order("created_at", { ascending: false }),
      db.from("order_fulfilment_steps").select("order_id,completed_on"),
      db
        .from("order_pdi")
        .select("order_id,result,created_at")
        .order("created_at", { ascending: false }),
      db.from("order_deliveries").select("order_id,qty_delivered,status"),
    ]);
    const firstError = orders.error || steps.error || pdi.error || deliveries.error;
    if (firstError) return { ok: false, error: firstError.message, rows: [] };

    const stepsDone = new Map<string, number>();
    for (const s of steps.data ?? []) {
      if (s.completed_on) stepsDone.set(s.order_id, (stepsDone.get(s.order_id) ?? 0) + 1);
    }
    const latestPdi = new Map<string, string>();
    for (const p of pdi.data ?? []) {
      if (!latestPdi.has(p.order_id)) latestPdi.set(p.order_id, p.result);
    }
    const delivered = new Map<string, number>();
    for (const d of deliveries.data ?? []) {
      if (d.status === "delivered") {
        delivered.set(d.order_id, (delivered.get(d.order_id) ?? 0) + Number(d.qty_delivered));
      }
    }

    const rows: FulfilmentRow[] = (orders.data ?? []).map((o) => {
      const oem = Array.isArray(o.oems) ? o.oems[0] : o.oems;
      const req = Array.isArray(o.requirements) ? o.requirements[0] : o.requirements;
      const quote = Array.isArray(o.quotes) ? o.quotes[0] : o.quotes;
      const ordered = ((quote?.quote_lines ?? []) as { quantity: number | null }[]).reduce(
        (s, l) => s + (Number(l.quantity) || 0),
        0,
      );
      return {
        order_id: o.id,
        po_number: o.po_number,
        tender_ref: req?.tender_ref ?? "—",
        customer: req?.customer ?? "—",
        oem_name: oem?.name ?? null,
        deadline: o.delivery_deadline,
        steps_done: stepsDone.get(o.id) ?? 0,
        pdi: latestPdi.get(o.id) ?? null,
        ordered,
        delivered: delivered.get(o.id) ?? 0,
      };
    });
    return { ok: true, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), rows: [] };
  }
}

export { STEPS_TOTAL };

// --- Payments board --------------------------------------------------------
export type InvoiceRow = {
  id: string;
  invoice_number: string;
  amount: number | null;
  paid: number;
  balance: number;
  invoice_date: string | null;
  status: "paid" | "overdue" | "outstanding";
  order_id: string;
  po_number: string;
  tender_ref: string;
};

export type PaymentsBoardResult =
  | { ok: true; rows: InvoiceRow[]; outstanding: number; commissionPending: number }
  | { ok: false; error: string; rows: []; outstanding: number; commissionPending: number };

export async function listPaymentsBoard(): Promise<PaymentsBoardResult> {
  try {
    const db = supabaseAdmin();
    const [inv, pay, comm] = await Promise.all([
      db
        .from("order_invoices")
        .select("id,invoice_number,amount,invoice_date,order_id,orders(po_number,requirements(tender_ref))"),
      db.from("payments").select("invoice_id,amount"),
      db.from("commission_entries").select("commission_amount,status"),
    ]);
    const firstError = inv.error || pay.error || comm.error;
    if (firstError)
      return { ok: false, error: firstError.message, rows: [], outstanding: 0, commissionPending: 0 };

    const paid = new Map<string, number>();
    for (const p of pay.data ?? []) {
      if (p.invoice_id) paid.set(p.invoice_id, (paid.get(p.invoice_id) ?? 0) + Number(p.amount));
    }

    const rows: InvoiceRow[] = (inv.data ?? []).map((i) => {
      const order = Array.isArray(i.orders) ? i.orders[0] : i.orders;
      const req = order ? (Array.isArray(order.requirements) ? order.requirements[0] : order.requirements) : null;
      const p = paid.get(i.id) ?? 0;
      const balance = Math.max(0, (Number(i.amount) || 0) - p);
      const overdueBefore = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
      const status: InvoiceRow["status"] =
        balance <= 0 ? "paid" : i.invoice_date && i.invoice_date < overdueBefore ? "overdue" : "outstanding";
      return {
        id: i.id,
        invoice_number: i.invoice_number,
        amount: i.amount == null ? null : Number(i.amount),
        paid: p,
        balance,
        invoice_date: i.invoice_date,
        status,
        order_id: i.order_id,
        po_number: order?.po_number ?? "—",
        tender_ref: req?.tender_ref ?? "—",
      };
    });

    const outstanding = rows.reduce((s, r) => s + r.balance, 0);
    const commissionPending = (comm.data ?? [])
      .filter((c) => c.status !== "paid")
      .reduce((s, c) => s + (Number(c.commission_amount) || 0), 0);

    return { ok: true, rows, outstanding, commissionPending };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      rows: [],
      outstanding: 0,
      commissionPending: 0,
    };
  }
}
