"use server";

import { redirect } from "next/navigation";
import { createDocument } from "@/lib/documents";
import { getSessionUser } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";

export async function createDocumentAction(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const res = await createDocument({
    doc_type: String(formData.get("doc_type") ?? ""),
    title,
    supplier: String(formData.get("supplier") ?? ""),
    doc_no: String(formData.get("doc_no") ?? ""),
    issue_date: String(formData.get("issue_date") ?? ""),
    expiry_date: String(formData.get("expiry_date") ?? ""),
    product: String(formData.get("product") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!res.ok) {
    redirect(`/documents?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "document",
    entity_id: null,
    action: "created",
    details: { title },
  });
  redirect("/documents?ok=1");
}
