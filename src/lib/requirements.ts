import { supabaseAdmin } from "./supabase/admin";

export type RequirementRow = {
  id: string;
  tender_ref: string;
  customer: string;
  project: string | null;
  submission_deadline: string | null;
  status: string;
  lines: number;
};

export type ListResult =
  | { ok: true; rows: RequirementRow[] }
  | { ok: false; error: string; rows: [] };

export async function listRequirements(): Promise<ListResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("requirements")
      .select(
        "id,tender_ref,customer,project,submission_deadline,status,requirement_lines(count)",
      )
      .order("submission_deadline", { ascending: true, nullsFirst: false });

    if (error) {
      return { ok: false, error: error.message, rows: [] };
    }

    const rows: RequirementRow[] = (data ?? []).map((r) => {
      const lines = Array.isArray(r.requirement_lines)
        ? (r.requirement_lines[0]?.count ?? 0)
        : 0;
      return {
        id: r.id,
        tender_ref: r.tender_ref,
        customer: r.customer,
        project: r.project,
        submission_deadline: r.submission_deadline,
        status: r.status,
        lines,
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

export type NewLine = {
  part_description: string;
  client_part_no?: string;
  oem_part_no?: string;
  quantity?: string;
  unit?: string;
  delivery_required?: string;
};

export type NewRequirement = {
  tender_ref: string;
  customer: string;
  project?: string;
  source?: string;
  submission_deadline?: string;
  notes?: string;
  lines: NewLine[];
};

export type CreateResult =
  | { ok: true; id: string; lineCount: number }
  | { ok: false; error: string };

// Validate at the edge: reject missing required fields with a reason, save nothing.
export async function createRequirement(
  input: NewRequirement,
): Promise<CreateResult> {
  const tenderRef = input.tender_ref?.trim();
  const customer = input.customer?.trim();
  if (!tenderRef)
    return { ok: false, error: "Tender / enquiry reference is required." };
  if (!customer) return { ok: false, error: "Customer is required." };

  const lines = (input.lines ?? []).filter(
    (l) =>
      l.part_description?.trim() ||
      l.quantity?.trim() ||
      l.client_part_no?.trim(),
  );
  for (const [i, l] of lines.entries()) {
    if (!l.part_description?.trim()) {
      return { ok: false, error: `Line ${i + 1}: part description is required.` };
    }
    if (l.quantity && Number.isNaN(Number(l.quantity))) {
      return { ok: false, error: `Line ${i + 1}: quantity must be a number.` };
    }
  }

  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("requirements")
      .insert({
        tender_ref: tenderRef,
        customer,
        project: input.project?.trim() || null,
        source: input.source?.trim() || null,
        submission_deadline: input.submission_deadline?.trim() || null,
        notes: input.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Could not save the requirement.",
      };
    }

    if (lines.length > 0) {
      const { error: lineError } = await db.from("requirement_lines").insert(
        lines.map((l, i) => ({
          requirement_id: data.id,
          part_description: l.part_description.trim(),
          client_part_no: l.client_part_no?.trim() || null,
          oem_part_no: l.oem_part_no?.trim() || null,
          quantity: l.quantity?.trim() ? Number(l.quantity) : null,
          unit: l.unit?.trim() || null,
          delivery_required: l.delivery_required?.trim() || null,
          sort_order: i,
        })),
      );

      if (lineError) {
        // Best-effort rollback so we never leave a header without its lines.
        await db.from("requirements").delete().eq("id", data.id);
        return { ok: false, error: `Line items failed: ${lineError.message}` };
      }
    }

    return { ok: true, id: data.id, lineCount: lines.length };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export type RequirementLine = {
  id: string;
  part_description: string;
  client_part_no: string | null;
  oem_part_no: string | null;
  quantity: number | null;
  unit: string | null;
};

export type RequirementDetail = {
  id: string;
  tender_ref: string;
  customer: string;
  project: string | null;
  source: string | null;
  submission_deadline: string | null;
  status: string;
  notes: string | null;
  lines: RequirementLine[];
};

export type DetailResult =
  | { ok: true; data: RequirementDetail }
  | { ok: false; error: string };

export async function getRequirement(id: string): Promise<DetailResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("requirements")
      .select(
        "id,tender_ref,customer,project,source,submission_deadline,status,notes,requirement_lines(id,part_description,client_part_no,oem_part_no,quantity,unit,sort_order)",
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Requirement not found." };
    }

    const lines: RequirementLine[] = [...(data.requirement_lines ?? [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((l) => ({
        id: l.id,
        part_description: l.part_description,
        client_part_no: l.client_part_no,
        oem_part_no: l.oem_part_no,
        quantity: l.quantity,
        unit: l.unit,
      }));

    return { ok: true, data: { ...data, lines } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
