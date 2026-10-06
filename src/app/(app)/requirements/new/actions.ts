"use server";

import { redirect } from "next/navigation";
import { createRequirement, type NewLine } from "@/lib/requirements";
import { getSessionUser } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";

export async function createRequirementAction(formData: FormData) {
  let lines: NewLine[] = [];
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    lines = [];
  }

  const tender_ref = String(formData.get("tender_ref") ?? "");
  const res = await createRequirement({
    tender_ref,
    customer: String(formData.get("customer") ?? ""),
    project: String(formData.get("project") ?? ""),
    source: String(formData.get("source") ?? ""),
    submission_deadline: String(formData.get("submission_deadline") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    lines,
  });

  if (!res.ok) {
    redirect(`/requirements/new?error=${encodeURIComponent(res.error)}`);
  }

  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "requirement",
    entity_id: res.id,
    action: "created",
    details: { tender_ref },
  });

  redirect("/?created=1");
}
