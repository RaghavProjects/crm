import { supabaseAdmin } from "./supabase/admin";

export type AskRow = { label: string; href?: string };
export type AskResult =
  | { answered: true; answer: string; rows: AskRow[] }
  | { answered: false; message: string };

const UNSUPPORTED =
  "That question is not one the stored data can answer. Supported questions: " +
  '"how many open orders", "how many open requirements", "what did we lose this month", ' +
  '"what did we win this month", "outstanding payments", "documents expiring", ' +
  '"orders at risk", "pending OEM responses".';

function monthStartISO() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export async function askQuestion(input: string): Promise<AskResult> {
  const q = input.toLowerCase();
  const db = supabaseAdmin();

  try {
    if (/risk|late|overdue|delay/.test(q) && /order|deliver/.test(q)) {
      const { data } = await db
        .from("orders")
        .select("id,po_number,status,delivery_deadline");
      const today = new Date().toISOString().slice(0, 10);
      const risk = (data ?? []).filter(
        (o) => o.status === "open" && o.delivery_deadline && o.delivery_deadline < today,
      );
      return {
        answered: true,
        answer:
          risk.length === 0
            ? "No open orders are past their delivery deadline."
            : `${risk.length} open order(s) are past or at their delivery deadline.`,
        rows: risk.map((o) => ({
          label: `PO ${o.po_number} · due ${o.delivery_deadline}`,
          href: `/orders/${o.id}`,
        })),
      };
    }

    if (/los|what did we lose|loss/.test(q)) {
      const { data } = await db
        .from("requirements")
        .select("id,tender_ref,customer,loss_reason,updated_at")
        .eq("status", "lost");
      const month = monthStartISO();
      const rows = (data ?? []).filter((r) => (r.updated_at ?? "") >= month);
      return {
        answered: true,
        answer:
          rows.length === 0
            ? "Nothing recorded as lost this month."
            : `${rows.length} requirement(s) lost this month.`,
        rows: rows.map((r) => ({
          label: `${r.tender_ref} · ${r.customer} · ${r.loss_reason ?? "no reason"}`,
          href: `/requirements/${r.id}`,
        })),
      };
    }

    if (/won|what did we win/.test(q)) {
      const { data } = await db
        .from("requirements")
        .select("id,tender_ref,customer,updated_at")
        .eq("status", "won");
      const month = monthStartISO();
      const rows = (data ?? []).filter((r) => (r.updated_at ?? "") >= month);
      return {
        answered: true,
        answer:
          rows.length === 0
            ? "Nothing recorded as won this month."
            : `${rows.length} requirement(s) won this month.`,
        rows: rows.map((r) => ({
          label: `${r.tender_ref} · ${r.customer}`,
          href: `/requirements/${r.id}`,
        })),
      };
    }

    if (/payment|outstanding|receivable|pending amount/.test(q)) {
      const [inv, pay] = await Promise.all([
        db.from("order_invoices").select("id,amount,invoice_number,order_id"),
        db.from("payments").select("invoice_id,amount"),
      ]);
      const paid = new Map<string, number>();
      for (const p of pay.data ?? []) {
        if (p.invoice_id)
          paid.set(p.invoice_id, (paid.get(p.invoice_id) ?? 0) + Number(p.amount));
      }
      const rows = (inv.data ?? [])
        .map((i) => ({
          i,
          bal: (Number(i.amount) || 0) - (paid.get(i.id) ?? 0),
        }))
        .filter((x) => x.bal > 0);
      const total = rows.reduce((s, x) => s + x.bal, 0);
      return {
        answered: true,
        answer:
          rows.length === 0
            ? "No outstanding payments."
            : `Outstanding across ${rows.length} invoice(s): ₹${total.toLocaleString("en-IN")}.`,
        rows: rows.map((x) => ({
          label: `Invoice ${x.i.invoice_number} · balance ₹${x.bal.toLocaleString("en-IN")}`,
          href: `/orders/${x.i.order_id}`,
        })),
      };
    }

    if (/expir|document/.test(q)) {
      const { data } = await db.from("documents").select("id,title,expiry_date");
      const horizon = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
      const rows = (data ?? []).filter(
        (d) => d.expiry_date && d.expiry_date <= horizon,
      );
      return {
        answered: true,
        answer:
          rows.length === 0
            ? "No documents expiring within 90 days."
            : `${rows.length} document(s) expiring within 90 days.`,
        rows: rows.map((d) => ({ label: `${d.title} · expires ${d.expiry_date}` })),
      };
    }

    if (/oem|response/.test(q)) {
      const { data } = await db
        .from("requirement_oems")
        .select("id,oems(name)")
        .eq("status", "requested");
      const rows = data ?? [];
      return {
        answered: true,
        answer:
          rows.length === 0
            ? "No OEM responses are pending."
            : `${rows.length} OEM request(s) awaiting a response.`,
        rows: rows.map((r) => {
          const oem = Array.isArray(r.oems) ? r.oems[0] : r.oems;
          return { label: oem?.name ?? "OEM" };
        }),
      };
    }

    if (/order|po\b/.test(q)) {
      const { data } = await db.from("orders").select("id,po_number,status");
      const open = (data ?? []).filter((o) => o.status === "open");
      return {
        answered: true,
        answer: `There are ${open.length} open order(s) (of ${(data ?? []).length} total).`,
        rows: open.map((o) => ({ label: `PO ${o.po_number}`, href: `/orders/${o.id}` })),
      };
    }

    if (/requirement|rfi|enquir|tender/.test(q)) {
      const { data } = await db.from("requirements").select("id,tender_ref,status");
      const open = (data ?? []).filter((r) =>
        ["received", "qualifying", "quoted", "submitted"].includes(r.status),
      );
      return {
        answered: true,
        answer: `There are ${open.length} open requirement(s) (of ${(data ?? []).length} total).`,
        rows: open.map((r) => ({
          label: `${r.tender_ref} · ${r.status}`,
          href: `/requirements/${r.id}`,
        })),
      };
    }

    return { answered: false, message: UNSUPPORTED };
  } catch (e) {
    return {
      answered: false,
      message: `I could not read the data: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
