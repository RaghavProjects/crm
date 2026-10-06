import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Full export of every business table, as a JSON download. Protected by the
// same login middleware as the rest of the app.
const TABLES = [
  "requirements",
  "requirement_lines",
  "oems",
  "requirement_oems",
  "line_coverage",
  "quotes",
  "quote_lines",
  "orders",
  "order_invoices",
  "order_fulfilment_steps",
  "order_pdi",
  "order_deliveries",
  "documents",
  "payments",
  "commission_entries",
  "profiles",
  "audit_events",
];

export async function GET() {
  const db = supabaseAdmin();
  const tables: Record<string, unknown[]> = {};

  for (const t of TABLES) {
    const { data } = await db.from(t).select("*");
    tables[t] = data ?? [];
  }

  const body = JSON.stringify(
    { exported_at: new Date().toISOString(), tables },
    null,
    2,
  );

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="crm-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}
