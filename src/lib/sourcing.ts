import { supabaseAdmin } from "./supabase/admin";

export type SourcingRow = {
  id: string;
  status: string;
  requested_on: string | null;
  responded_on: string | null;
  request_notes: string | null;
  response_notes: string | null;
  quoted_price: number | null;
  lead_time_days: number | null;
  oem_id: string;
  oem_name: string;
};

export type SourcingResult =
  | { ok: true; rows: SourcingRow[] }
  | { ok: false; error: string; rows: [] };

export async function listSourcing(
  requirementId: string,
): Promise<SourcingResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("requirement_oems")
      .select(
        "id,status,requested_on,responded_on,request_notes,response_notes,quoted_price,lead_time_days,oem_id,oems(name)",
      )
      .eq("requirement_id", requirementId)
      .order("created_at", { ascending: true });

    if (error) return { ok: false, error: error.message, rows: [] };

    const rows: SourcingRow[] = (data ?? []).map((r) => {
      const oem = Array.isArray(r.oems) ? r.oems[0] : r.oems;
      return {
        id: r.id,
        status: r.status,
        requested_on: r.requested_on,
        responded_on: r.responded_on,
        request_notes: r.request_notes,
        response_notes: r.response_notes,
        quoted_price: r.quoted_price,
        lead_time_days: r.lead_time_days,
        oem_id: r.oem_id,
        oem_name: oem?.name ?? "—",
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

const today = () => new Date().toISOString().slice(0, 10);

export async function shortlistOem(
  requirementId: string,
  oemId: string,
  requestNotes?: string,
): Promise<MutateResult> {
  if (!oemId) return { ok: false, error: "Select an OEM to shortlist." };
  try {
    const { error } = await supabaseAdmin()
      .from("requirement_oems")
      .insert({
        requirement_id: requirementId,
        oem_id: oemId,
        status: "requested",
        requested_on: today(),
        request_notes: requestNotes?.trim() || null,
      });
    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "That OEM is already shortlisted here." };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const STATUSES = ["shortlisted", "requested", "responded", "declined"];

export async function logResponse(
  id: string,
  input: {
    status: string;
    response_notes?: string;
    quoted_price?: string;
    lead_time_days?: string;
  },
): Promise<MutateResult> {
  if (!STATUSES.includes(input.status)) {
    return { ok: false, error: "Invalid sourcing status." };
  }
  const price = input.quoted_price?.trim();
  if (price && Number.isNaN(Number(price))) {
    return { ok: false, error: "Quoted price must be a number." };
  }
  const lead = input.lead_time_days?.trim();
  if (lead && Number.isNaN(Number(lead))) {
    return { ok: false, error: "Lead time must be a number of days." };
  }

  const closed = input.status === "responded" || input.status === "declined";
  try {
    const { error } = await supabaseAdmin()
      .from("requirement_oems")
      .update({
        status: input.status,
        response_notes: input.response_notes?.trim() || null,
        quoted_price: price ? Number(price) : null,
        lead_time_days: lead ? Number(lead) : null,
        responded_on: closed ? today() : null,
      })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
