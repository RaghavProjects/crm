"use server";

import { redirect } from "next/navigation";
import { shortlistOem, logResponse } from "@/lib/sourcing";
import { addCoverage, deleteCoverage } from "@/lib/coverage";

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

export async function addCoverageAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const res = await addCoverage({
    requirement_id: requirementId,
    line_id: String(formData.get("line_id") ?? ""),
    oem_id: String(formData.get("oem_id") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    delivery_date: String(formData.get("delivery_date") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!res.ok) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(res.error)}`);
  }
  redirect(`/requirements/${requirementId}?ok=1`);
}

export async function deleteCoverageAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const res = await deleteCoverage(String(formData.get("coverage_id") ?? ""));
  if (!res.ok) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(res.error)}`);
  }
  redirect(`/requirements/${requirementId}?ok=1`);
}
