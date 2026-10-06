import { supabaseAdmin } from "./supabase/admin";

export type OemRow = {
  id: string;
  name: string;
  location: string | null;
  products: string | null;
  lead_time_days: number | null;
  approved: boolean;
  commission_pct: number | null;
  email: string | null;
};

export type OemListResult =
  | { ok: true; rows: OemRow[] }
  | { ok: false; error: string; rows: [] };

export async function listOems(): Promise<OemListResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("oems")
      .select(
        "id,name,location,products,lead_time_days,approved,commission_pct,email",
      )
      .order("name", { ascending: true });

    if (error) return { ok: false, error: error.message, rows: [] };
    return { ok: true, rows: (data ?? []) as OemRow[] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      rows: [],
    };
  }
}

export type OemOption = { id: string; name: string };

export async function listOemOptions(): Promise<OemOption[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("oems")
      .select("id,name")
      .order("name", { ascending: true });
    if (error) return [];
    return (data ?? []) as OemOption[];
  } catch {
    return [];
  }
}

export type NewOem = {
  name: string;
  location?: string;
  spoc?: string;
  mobile?: string;
  email?: string;
  gst_no?: string;
  vendor_code?: string;
  products?: string;
  capabilities?: string;
  lead_time_days?: string;
  approved?: boolean;
  commission_pct?: string;
  notes?: string;
};

export type CreateOemResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// Validate at the edge: reject missing required fields with a reason, save nothing.
export async function createOem(input: NewOem): Promise<CreateOemResult> {
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "OEM name is required." };

  const email = input.email?.trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Email address is not valid." };
  }
  const lead = input.lead_time_days?.trim();
  if (lead && Number.isNaN(Number(lead))) {
    return { ok: false, error: "Lead time must be a number of days." };
  }
  const commission = input.commission_pct?.trim();
  if (commission && Number.isNaN(Number(commission))) {
    return { ok: false, error: "Commission % must be a number." };
  }

  try {
    const { data, error } = await supabaseAdmin()
      .from("oems")
      .insert({
        name,
        location: input.location?.trim() || null,
        spoc: input.spoc?.trim() || null,
        mobile: input.mobile?.trim() || null,
        email: email || null,
        gst_no: input.gst_no?.trim() || null,
        vendor_code: input.vendor_code?.trim() || null,
        products: input.products?.trim() || null,
        capabilities: input.capabilities?.trim() || null,
        lead_time_days: lead ? Number(lead) : null,
        approved: Boolean(input.approved),
        commission_pct: commission ? Number(commission) : null,
        notes: input.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Could not save the OEM." };
    }
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
