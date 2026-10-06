import { supabaseAdmin } from "./supabase/admin";

export type QuoteLine = {
  id: string;
  description: string;
  quantity: number | null;
  oem_price: number;
  lead_time_days: number | null;
  margin_pct: number | null;
  recommended_price: number | null;
};

export type Quote = {
  id: string;
  version: number;
  status: string;
  target_margin_pct: number | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  lines: QuoteLine[];
};

export type QuotesResult =
  | { ok: true; rows: Quote[] }
  | { ok: false; error: string; rows: [] };

export async function listQuotes(requirementId: string): Promise<QuotesResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("quotes")
      .select(
        "id,version,status,target_margin_pct,notes,approved_by,approved_at,quote_lines(id,description,quantity,oem_price,lead_time_days,margin_pct,recommended_price,sort_order)",
      )
      .eq("requirement_id", requirementId)
      .order("version", { ascending: false });

    if (error) return { ok: false, error: error.message, rows: [] };

    const rows: Quote[] = (data ?? []).map((q) => ({
      id: q.id,
      version: q.version,
      status: q.status,
      target_margin_pct: q.target_margin_pct,
      notes: q.notes,
      approved_by: q.approved_by,
      approved_at: q.approved_at,
      lines: [...(q.quote_lines ?? [])]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((l) => ({
          id: l.id,
          description: l.description,
          quantity: l.quantity,
          oem_price: Number(l.oem_price),
          lead_time_days: l.lead_time_days,
          margin_pct: l.margin_pct,
          recommended_price:
            l.recommended_price == null ? null : Number(l.recommended_price),
        })),
    }));
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

export type NewQuoteLine = {
  description: string;
  quantity: string;
  oem_price: string;
  lead_time_days?: string;
  margin_pct?: string;
};

export type NewQuote = {
  target_margin_pct?: string;
  notes?: string;
  lines: NewQuoteLine[];
};

function recommended(price: number, marginPct: number | null) {
  const m = marginPct ?? 0;
  return Math.round(price * (1 + m / 100) * 100) / 100;
}

// Validate at the edge: reject bad input with a reason, save nothing.
export async function createQuote(
  requirementId: string,
  input: NewQuote,
): Promise<MutateResult> {
  if (!requirementId) return { ok: false, error: "Requirement is required." };

  const lines = (input.lines ?? []).filter((l) => l.oem_price?.trim());
  if (lines.length === 0) {
    return { ok: false, error: "Add an OEM price to at least one line." };
  }
  for (const [i, l] of lines.entries()) {
    const price = Number(l.oem_price);
    if (Number.isNaN(price) || price < 0) {
      return { ok: false, error: `Line ${i + 1}: OEM price must be a number ≥ 0.` };
    }
    if (l.margin_pct?.trim() && Number.isNaN(Number(l.margin_pct))) {
      return { ok: false, error: `Line ${i + 1}: margin must be a number.` };
    }
    if (l.lead_time_days?.trim() && Number.isNaN(Number(l.lead_time_days))) {
      return { ok: false, error: `Line ${i + 1}: lead time must be a number.` };
    }
  }
  const target = input.target_margin_pct?.trim();
  if (target && Number.isNaN(Number(target))) {
    return { ok: false, error: "Target margin must be a number." };
  }

  try {
    const db = supabaseAdmin();

    const existing = await db
      .from("quotes")
      .select("version")
      .eq("requirement_id", requirementId)
      .order("version", { ascending: false })
      .limit(1);
    const nextVersion = (existing.data?.[0]?.version ?? 0) + 1;

    const { data, error } = await db
      .from("quotes")
      .insert({
        requirement_id: requirementId,
        version: nextVersion,
        status: "draft",
        target_margin_pct: target ? Number(target) : null,
        notes: input.notes?.trim() || null,
      })
      .select("id")
      .single();
    if (error || !data) {
      return { ok: false, error: error?.message ?? "Could not save the quote." };
    }

    const { error: lineError } = await db.from("quote_lines").insert(
      lines.map((l, i) => {
        const price = Number(l.oem_price);
        const margin = l.margin_pct?.trim() ? Number(l.margin_pct) : null;
        return {
          quote_id: data.id,
          description: l.description,
          quantity: l.quantity?.trim() ? Number(l.quantity) : null,
          oem_price: price,
          lead_time_days: l.lead_time_days?.trim()
            ? Number(l.lead_time_days)
            : null,
          margin_pct: margin,
          recommended_price: recommended(price, margin),
          sort_order: i,
        };
      }),
    );
    if (lineError) {
      await db.from("quotes").delete().eq("id", data.id);
      return { ok: false, error: `Quote lines failed: ${lineError.message}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function approveQuote(
  id: string,
  actor: string | null,
): Promise<MutateResult> {
  if (!id) return { ok: false, error: "Quote is required." };
  try {
    const { error } = await supabaseAdmin()
      .from("quotes")
      .update({
        status: "approved",
        approved_by: actor,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type PastBid = {
  id: string;
  description: string;
  oem_price: number;
  recommended_price: number | null;
  lead_time_days: number | null;
  tender_ref: string;
  customer: string;
  requirement_status: string;
};

export async function getPastBids(
  requirementId: string,
  keyword: string | null,
): Promise<PastBid[]> {
  try {
    let query = supabaseAdmin()
      .from("past_bids")
      .select(
        "id,description,oem_price,recommended_price,lead_time_days,tender_ref,customer,requirement_status",
      )
      .in("requirement_status", ["won", "lost"])
      .neq("requirement_id", requirementId)
      .limit(20);

    if (keyword) {
      query = query.ilike("description", `%${keyword}%`);
    }

    const { data, error } = await query;
    if (error) return [];
    return (data ?? []) as PastBid[];
  } catch {
    return [];
  }
}
