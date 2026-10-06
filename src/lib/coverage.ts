import { supabaseAdmin } from "./supabase/admin";

export type CoverageKind = "firm" | "availability";

export type CoverageRow = {
  id: string;
  line_id: string;
  oem_id: string;
  oem_name: string;
  kind: CoverageKind;
  quantity: number;
  delivery_date: string | null;
  notes: string | null;
};

export type CoverageResult =
  | { ok: true; rows: CoverageRow[] }
  | { ok: false; error: string; rows: [] };

export async function listCoverage(
  requirementId: string,
): Promise<CoverageResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("line_coverage")
      .select(
        "id,line_id,oem_id,kind,quantity,delivery_date,notes,oems(name)",
      )
      .eq("requirement_id", requirementId)
      .order("created_at", { ascending: true });

    if (error) return { ok: false, error: error.message, rows: [] };

    const rows: CoverageRow[] = (data ?? []).map((r) => {
      const oem = Array.isArray(r.oems) ? r.oems[0] : r.oems;
      return {
        id: r.id,
        line_id: r.line_id,
        oem_id: r.oem_id,
        oem_name: oem?.name ?? "—",
        kind: r.kind as CoverageKind,
        quantity: Number(r.quantity),
        delivery_date: r.delivery_date,
        notes: r.notes,
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

export type NewCoverage = {
  requirement_id: string;
  line_id: string;
  oem_id: string;
  kind: string;
  quantity: string;
  delivery_date?: string;
  notes?: string;
};

// Validate at the edge: reject bad input with a reason, save nothing.
export async function addCoverage(
  input: NewCoverage,
): Promise<MutateResult> {
  if (!input.line_id) return { ok: false, error: "Choose a line item." };
  if (!input.oem_id) return { ok: false, error: "Choose an OEM." };
  if (input.kind !== "firm" && input.kind !== "availability") {
    return { ok: false, error: "Kind must be firm or availability." };
  }
  const qty = input.quantity?.trim();
  if (!qty || Number.isNaN(Number(qty)) || Number(qty) <= 0) {
    return { ok: false, error: "Quantity must be greater than zero." };
  }

  try {
    const { error } = await supabaseAdmin()
      .from("line_coverage")
      .insert({
        requirement_id: input.requirement_id,
        line_id: input.line_id,
        oem_id: input.oem_id,
        kind: input.kind,
        quantity: Number(qty),
        delivery_date: input.delivery_date?.trim() || null,
        notes: input.notes?.trim() || null,
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteCoverage(id: string): Promise<MutateResult> {
  try {
    const { error } = await supabaseAdmin()
      .from("line_coverage")
      .delete()
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
