"use server";

import { redirect } from "next/navigation";
import { createOem } from "@/lib/oems";
import { getSessionUser } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";

export async function createOemAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const res = await createOem({
    name,
    location: String(formData.get("location") ?? ""),
    spoc: String(formData.get("spoc") ?? ""),
    mobile: String(formData.get("mobile") ?? ""),
    email: String(formData.get("email") ?? ""),
    gst_no: String(formData.get("gst_no") ?? ""),
    vendor_code: String(formData.get("vendor_code") ?? ""),
    products: String(formData.get("products") ?? ""),
    capabilities: String(formData.get("capabilities") ?? ""),
    lead_time_days: String(formData.get("lead_time_days") ?? ""),
    approved: formData.get("approved") === "on",
    commission_pct: String(formData.get("commission_pct") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!res.ok) {
    redirect(`/oems/new?error=${encodeURIComponent(res.error)}`);
  }

  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "oem",
    entity_id: res.id,
    action: "created",
    details: { name },
  });

  redirect("/oems?created=1");
}
