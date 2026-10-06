"use server";

import { redirect } from "next/navigation";
import { createApproval } from "@/lib/masters";
import { getSessionUser } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";

export async function createApprovalAction(formData: FormData) {
  const authority = String(formData.get("authority") ?? "");
  const res = await createApproval({
    oem: String(formData.get("oem") ?? ""),
    authority,
    certificate_no: String(formData.get("certificate_no") ?? ""),
    valid_till: String(formData.get("valid_till") ?? ""),
  });
  if (!res.ok) {
    redirect(`/approvals?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "approval",
    entity_id: null,
    action: "created",
    details: { authority },
  });
  redirect("/approvals?ok=1");
}
