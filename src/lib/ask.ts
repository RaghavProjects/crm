import { supabaseAdmin } from "./supabase/admin";
import { getDashboard } from "./dashboard";
import { plural } from "./format";

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
    if (/attention|needs my attention|what needs|pipeline/.test(q)) {
      const d = await getDashboard();
      if (!d.ok) return { answered: false, message: "Could not read the data." };
      const dueSoon = d.data.openOrders.filter((o) => o.health === "at_risk").length;
      const rows: AskRow[] = [];
      if (d.data.ordersAtRisk.length)
        rows.push({
          label: `${d.data.ordersAtRisk.length} orders at delivery risk`,
          href: "/fulfilment",
        });
      if (dueSoon)
        rows.push({ label: `${dueSoon} deliveries due within 7 days`, href: "/fulfilment" });
      if (d.data.quotesAwaitingResponse.length)
        rows.push({
          label: `${d.data.quotesAwaitingResponse.length} quotations awaiting a response`,
          href: "/quotations",
        });
      if (d.data.payments.overdueCount)
        rows.push({
          label: `${d.data.payments.overdueCount} overdue payments`,
          href: "/payments",
        });
      if (d.data.documentsExpiring.length)
        rows.push({
          label: `${d.data.documentsExpiring.length} documents expiring within 90 days`,
          href: "/documents",
        });
      const total =
        d.data.ordersAtRisk.length +
        dueSoon +
        d.data.quotesAwaitingResponse.length +
        d.data.payments.overdueCount;
      return {
        answered: true,
        answer:
          total === 0
            ? "Nothing needs your attention today."
            : `${plural(total, "item")} require attention today.`,
        rows,
      };
    }

    if (/due this week|due soon|due within/.test(q)) {
      const { data } = await db
        .from("orders")
        .select("id,po_number,status,delivery_deadline");
      const soon = (data ?? []).filter((o) => {
        if (o.status !== "open" || !o.delivery_deadline) return false;
        const days = Math.round(
          (new Date(`${o.delivery_deadline}T00:00:00Z`).getTime() - Date.now()) / 86_400_000,
        );
        return days >= 0 && days <= 7;
      });
      return {
        answered: true,
        answer:
          soon.length === 0
            ? "No open orders are due within 7 days."
            : `${plural(soon.length, "open order")} due within 7 days.`,
        rows: soon.map((o) => ({
          label: `PO ${o.po_number} · due ${o.delivery_deadline}`,
          href: `/orders/${o.id}`,
        })),
      };
    }

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
            : `${plural(risk.length, "open order")} past or at their delivery deadline.`,
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
            : `${plural(rows.length, "requirement")} lost this month.`,
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
            : `${plural(rows.length, "requirement")} won this month.`,
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
            : `Outstanding across ${plural(rows.length, "invoice")}: ₹${total.toLocaleString("en-IN")}.`,
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
            : `${plural(rows.length, "document")} expiring within 90 days.`,
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
            : `${plural(rows.length, "OEM request")} awaiting a response.`,
        rows: rows.map((r) => {
          const oem = Array.isArray(r.oems) ? r.oems[0] : r.oems;
          return { label: oem?.name ?? "OEM" };
        }),
      };
    }

    if (/quote|quotation/.test(q)) {
      const { data } = await db
        .from("requirements")
        .select("id,tender_ref,customer,status")
        .eq("status", "submitted");
      const rows = data ?? [];
      return {
        answered: true,
        answer:
          rows.length === 0
            ? "No quotations are awaiting a response."
            : `${plural(rows.length, "quotation")} awaiting a response.`,
        rows: rows.map((r) => ({
          label: `${r.tender_ref} · ${r.customer}`,
          href: `/requirements/${r.id}`,
        })),
      };
    }

    if (/order|po\b/.test(q)) {
      const { data } = await db.from("orders").select("id,po_number,status");
      const open = (data ?? []).filter((o) => o.status === "open");
      return {
        answered: true,
        answer: `There are ${plural(open.length, "open order")} (of ${(data ?? []).length} total).`,
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
        answer: `There are ${plural(open.length, "open requirement")} (of ${(data ?? []).length} total).`,
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
