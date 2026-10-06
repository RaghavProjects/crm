"use server";

import { redirect } from "next/navigation";
import { createCustomer } from "@/lib/masters";
import { getSessionUser } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";

export async function createCustomerAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const res = await createCustomer({
    name,
    location: String(formData.get("location") ?? ""),
    gst_no: String(formData.get("gst_no") ?? ""),
    items_approved: String(formData.get("items_approved") ?? ""),
  });
  if (!res.ok) {
    redirect(`/customers?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "customer",
    entity_id: null,
    action: "created",
    details: { name },
  });
  redirect("/customers?ok=1");
}
