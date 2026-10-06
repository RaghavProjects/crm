import { supabaseAdmin } from "./supabase/admin";

export async function recordAudit(input: {
  actor?: string | null;
  entity: string;
  entity_id?: string | null;
  action: string;
  details?: unknown;
}) {
  try {
    await supabaseAdmin()
      .from("audit_events")
      .insert({
        actor: input.actor ?? null,
        entity: input.entity,
        entity_id: input.entity_id ?? null,
        action: input.action,
        details: input.details ?? null,
      });
  } catch {
    // Never block the primary action on the audit write.
  }
}

export type AuditRow = {
  id: number;
  at: string;
  actor: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  details: unknown;
};

export type AuditResult =
  | { ok: true; rows: AuditRow[] }
  | { ok: false; error: string; rows: [] };

export async function listAudit(limit = 200): Promise<AuditResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("audit_events")
      .select("id,at,actor,entity,entity_id,action,details")
      .order("at", { ascending: false })
      .limit(limit);
    if (error) return { ok: false, error: error.message, rows: [] };
    return { ok: true, rows: (data ?? []) as AuditRow[] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      rows: [],
    };
  }
}
