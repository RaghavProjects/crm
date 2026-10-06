import { supabaseAdmin } from "./supabase/admin";

export type Invoice = {
  id: string;
  invoice_number: string;
  invoice_date: string | null;
  amount: number | null;
  notes: string | null;
};

export type Order = {
  id: string;
  quote_id: string;
  po_number: string;
  po_date: string | null;
  delivery_deadline: string | null;
  oem_id: string | null;
  oem_name: string | null;
  supplier_po: string | null;
  pdi_required: boolean;
  status: string;
  notes: string | null;
  invoices: Invoice[];
};

export type OrdersResult =
  | { ok: true; rows: Order[] }
  | { ok: false; error: string; rows: [] };

export async function listOrders(requirementId: string): Promise<OrdersResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .select(
        "id,quote_id,po_number,po_date,delivery_deadline,oem_id,supplier_po,pdi_required,status,notes,oems(name),order_invoices(id,invoice_number,invoice_date,amount,notes)",
      )
      .eq("requirement_id", requirementId)
      .order("created_at", { ascending: true });

    if (error) return { ok: false, error: error.message, rows: [] };

    const rows: Order[] = (data ?? []).map((o) => {
      const oem = Array.isArray(o.oems) ? o.oems[0] : o.oems;
      return {
        id: o.id,
        quote_id: o.quote_id,
        po_number: o.po_number,
        po_date: o.po_date,
        delivery_deadline: o.delivery_deadline,
        oem_id: o.oem_id,
        oem_name: oem?.name ?? null,
        supplier_po: o.supplier_po,
        pdi_required: o.pdi_required,
        status: o.status,
        notes: o.notes,
        invoices: (o.order_invoices ?? []).map((i) => ({
          id: i.id,
          invoice_number: i.invoice_number,
          invoice_date: i.invoice_date,
          amount: i.amount == null ? null : Number(i.amount),
          notes: i.notes,
        })),
      };
    });
    return { ok: true, rows };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      rows: [],
    };
  }
}

export type MutateResult = { ok: true } | { ok: false; error: string };

export type NewOrder = {
  quote_id: string;
  po_number: string;
  po_date?: string;
  delivery_deadline?: string;
  oem_id?: string;
  supplier_po?: string;
  pdi_required?: boolean;
  notes?: string;
};

// No orphan PO: the order must come from a quotation, and that quotation must
// be approved. Anything else is rejected and saves nothing.
export async function createOrderFromQuote(
  requirementId: string,
  input: NewOrder,
): Promise<MutateResult> {
  if (!input.quote_id) {
    return { ok: false, error: "An order must come from a quotation." };
  }
  const po = input.po_number?.trim();
  if (!po) return { ok: false, error: "PO number is required." };

  try {
    const db = supabaseAdmin();

    const q = await db
      .from("quotes")
      .select("id,status,requirement_id")
      .eq("id", input.quote_id)
      .single();
    if (q.error || !q.data) {
      return { ok: false, error: "Quotation not found." };
    }
    if (q.data.requirement_id !== requirementId) {
      return { ok: false, error: "Quotation does not belong to this requirement." };
    }
    if (q.data.status !== "approved") {
      return { ok: false, error: "Every PO must map to an approved quotation." };
    }

    const { error } = await db.from("orders").insert({
      requirement_id: requirementId,
      quote_id: input.quote_id,
      po_number: po,
      po_date: input.po_date?.trim() || null,
      delivery_deadline: input.delivery_deadline?.trim() || null,
      oem_id: input.oem_id?.trim() || null,
      supplier_po: input.supplier_po?.trim() || null,
      pdi_required: Boolean(input.pdi_required),
      notes: input.notes?.trim() || null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type NewInvoice = {
  invoice_number: string;
  invoice_date?: string;
  amount?: string;
  notes?: string;
};

export async function addInvoice(
  orderId: string,
  input: NewInvoice,
): Promise<MutateResult> {
  if (!orderId) return { ok: false, error: "Order is required." };
  const num = input.invoice_number?.trim();
  if (!num) return { ok: false, error: "Invoice number is required." };
  const amount = input.amount?.trim();
  if (amount && (Number.isNaN(Number(amount)) || Number(amount) < 0)) {
    return { ok: false, error: "Invoice amount must be a number ≥ 0." };
  }

  try {
    const { error } = await supabaseAdmin()
      .from("order_invoices")
      .insert({
        order_id: orderId,
        invoice_number: num,
        invoice_date: input.invoice_date?.trim() || null,
        amount: amount ? Number(amount) : null,
        notes: input.notes?.trim() || null,
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type OrderDetail = {
  id: string;
  requirement_id: string;
  po_number: string;
  po_date: string | null;
  delivery_deadline: string | null;
  oem_name: string | null;
  supplier_po: string | null;
  pdi_required: boolean;
  status: string;
  notes: string | null;
  tender_ref: string;
  customer: string;
  ordered_qty: number;
  invoices: {
    id: string;
    invoice_number: string;
    invoice_date: string | null;
    amount: number | null;
  }[];
};

export type OrderDetailResult =
  | { ok: true; data: OrderDetail }
  | { ok: false; error: string };

export async function getOrder(id: string): Promise<OrderDetailResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .select(
        "id,requirement_id,po_number,po_date,delivery_deadline,oem_id,supplier_po,pdi_required,status,notes,oems(name),requirements(tender_ref,customer),quotes(quote_lines(quantity)),order_invoices(id,invoice_number,invoice_date,amount)",
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Order not found." };
    }

    const oem = Array.isArray(data.oems) ? data.oems[0] : data.oems;
    const req = Array.isArray(data.requirements)
      ? data.requirements[0]
      : data.requirements;
    const quote = Array.isArray(data.quotes) ? data.quotes[0] : data.quotes;
    const ordered_qty = ((quote?.quote_lines ?? []) as { quantity: number | null }[])
      .reduce((s, l) => s + (Number(l.quantity) || 0), 0);

    const invoices = (
      (data.order_invoices ?? []) as {
        id: string;
        invoice_number: string;
        invoice_date: string | null;
        amount: number | null;
      }[]
    ).map((i) => ({
      id: i.id,
      invoice_number: i.invoice_number,
      invoice_date: i.invoice_date,
      amount: i.amount == null ? null : Number(i.amount),
    }));

    return {
      ok: true,
      data: {
        id: data.id,
        requirement_id: data.requirement_id,
        po_number: data.po_number,
        po_date: data.po_date,
        delivery_deadline: data.delivery_deadline,
        oem_name: oem?.name ?? null,
        supplier_po: data.supplier_po,
        pdi_required: data.pdi_required,
        status: data.status,
        notes: data.notes,
        tender_ref: req?.tender_ref ?? "—",
        customer: req?.customer ?? "—",
        ordered_qty,
        invoices,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
