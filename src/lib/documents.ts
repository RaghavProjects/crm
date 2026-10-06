import { supabaseAdmin } from "./supabase/admin";

export type DocumentRow = {
  id: string;
  doc_type: string;
  title: string;
  supplier: string | null;
  doc_no: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  product: string | null;
  notes: string | null;
};

export type DocumentsResult =
  | { ok: true; rows: DocumentRow[] }
  | { ok: false; error: string; rows: [] };

export async function listDocuments(): Promise<DocumentsResult> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("documents")
      .select(
        "id,doc_type,title,supplier,doc_no,issue_date,expiry_date,product,notes",
      )
      .order("expiry_date", { ascending: true, nullsFirst: false });
    if (error) return { ok: false, error: error.message, rows: [] };
    return { ok: true, rows: (data ?? []) as DocumentRow[] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      rows: [],
    };
  }
}

export type MutateResult = { ok: true } | { ok: false; error: string };

export type NewDocument = {
  doc_type: string;
  title: string;
  supplier?: string;
  doc_no?: string;
  issue_date?: string;
  expiry_date?: string;
  product?: string;
  notes?: string;
};

// Validate at the edge: reject missing required fields with a reason, save nothing.
export async function createDocument(input: NewDocument): Promise<MutateResult> {
  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Document title is required." };
  const docType = input.doc_type?.trim();
  if (!docType) return { ok: false, error: "Document type is required." };
  if (
    input.issue_date?.trim() &&
    input.expiry_date?.trim() &&
    input.expiry_date < input.issue_date
  ) {
    return { ok: false, error: "Expiry date cannot be before the issue date." };
  }

  try {
    const { error } = await supabaseAdmin()
      .from("documents")
      .insert({
        doc_type: docType,
        title,
        supplier: input.supplier?.trim() || null,
        doc_no: input.doc_no?.trim() || null,
        issue_date: input.issue_date?.trim() || null,
        expiry_date: input.expiry_date?.trim() || null,
        product: input.product?.trim() || null,
        notes: input.notes?.trim() || null,
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function expiryState(expiry: string | null): "none" | "ok" | "soon" | "expired" {
  if (!expiry) return "none";
  const days = Math.round(
    (new Date(`${expiry}T00:00:00Z`).getTime() - Date.now()) / 86_400_000,
  );
  if (days < 0) return "expired";
  if (days <= 90) return "soon";
  return "ok";
}
