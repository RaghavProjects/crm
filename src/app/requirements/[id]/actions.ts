"use server";

import { redirect } from "next/navigation";
import { shortlistOem, logResponse } from "@/lib/sourcing";

export async function shortlistOemAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const oemId = String(formData.get("oem_id") ?? "");
  const notes = String(formData.get("request_notes") ?? "");
  const res = await shortlistOem(requirementId, oemId, notes);
  if (!res.ok) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(res.error)}`);
  }
  redirect(`/requirements/${requirementId}?ok=1`);
}

export async function logResponseAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const id = String(formData.get("sourcing_id") ?? "");
  const res = await logResponse(id, {
    status: String(formData.get("status") ?? ""),
    response_notes: String(formData.get("response_notes") ?? ""),
    quoted_price: String(formData.get("quoted_price") ?? ""),
    lead_time_days: String(formData.get("lead_time_days") ?? ""),
  });
  if (!res.ok) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(res.error)}`);
  }
  redirect(`/requirements/${requirementId}?ok=1`);
}
