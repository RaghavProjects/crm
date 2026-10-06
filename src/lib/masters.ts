import { supabaseAdmin } from "./supabase/admin";

export type MutateResult = { ok: true } | { ok: false; error: string };

// --- Customers -------------------------------------------------------------
export type CustomerRow = {
  id: string;
  name: string;
  location: string | null;
  gst_no: string | null;
  items_approved: string | null;
  renewal_due: string | null;
};

export type CustomersResult =
  | { ok: true; rows: CustomerRow[] }
  | { ok: false; error: string; rows: [] };

export async function listCustomers(): Promise<CustomersResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("customers")
      .select("id,name,location,gst_no,items_approved,renewal_due")
      .order("name", { ascending: true });
    if (error) return { ok: false, error: error.message, rows: [] };
    return { ok: true, rows: (data ?? []) as CustomerRow[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), rows: [] };
  }
}

export async function createCustomer(input: {
  name: string;
  location?: string;
  gst_no?: string;
  items_approved?: string;
}): Promise<MutateResult> {
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Customer name is required." };
  try {
    const { error } = await supabaseAdmin().from("customers").insert({
      name,
      location: input.location?.trim() || null,
      gst_no: input.gst_no?.trim() || null,
      items_approved: input.items_approved?.trim() || null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// --- Approvals / compliance ------------------------------------------------
export type ApprovalRow = {
  id: string;
  oem: string | null;
  authority: string | null;
  location: string | null;
  certificate_no: string | null;
  valid_till: string | null;
  renewal_due: string | null;
};

export type ApprovalsResult =
  | { ok: true; rows: ApprovalRow[] }
  | { ok: false; error: string; rows: [] };

export async function listApprovals(): Promise<ApprovalsResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("approvals")
      .select("id,oem,authority,location,certificate_no,valid_till,renewal_due")
      .order("valid_till", { ascending: true, nullsFirst: false });
    if (error) return { ok: false, error: error.message, rows: [] };
    return { ok: true, rows: (data ?? []) as ApprovalRow[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), rows: [] };
  }
}

export async function createApproval(input: {
  oem?: string;
  authority: string;
  certificate_no?: string;
  valid_till?: string;
}): Promise<MutateResult> {
  const authority = input.authority?.trim();
  if (!authority) return { ok: false, error: "Approval authority is required." };
  const valid = input.valid_till?.trim();
  if (valid && !/^\d{4}-\d{2}-\d{2}$/.test(valid)) {
    return { ok: false, error: "Valid-till must be a date." };
  }
  try {
    const { error } = await supabaseAdmin().from("approvals").insert({
      oem: input.oem?.trim() || null,
      authority,
      certificate_no: input.certificate_no?.trim() || null,
      valid_till: valid || null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
