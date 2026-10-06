"use server";

import { redirect } from "next/navigation";
import { shortlistOem, logResponse } from "@/lib/sourcing";
import { addCoverage, deleteCoverage } from "@/lib/coverage";
import { getSessionUser } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";

export async function shortlistOemAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const oemId = String(formData.get("oem_id") ?? "");
  const notes = String(formData.get("request_notes") ?? "");
  const res = await shortlistOem(requirementId, oemId, notes);
  if (!res.ok) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "sourcing",
    entity_id: requirementId,
    action: "shortlisted",
    details: { oem_id: oemId, request_notes: notes || null },
  });
  redirect(`/requirements/${requirementId}?ok=1`);
}

export async function logResponseAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const id = String(formData.get("sourcing_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const res = await logResponse(id, {
    status,
    response_notes: String(formData.get("response_notes") ?? ""),
    quoted_price: String(formData.get("quoted_price") ?? ""),
    lead_time_days: String(formData.get("lead_time_days") ?? ""),
  });
  if (!res.ok) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "sourcing",
    entity_id: id,
    action: `response:${status}`,
  });
  redirect(`/requirements/${requirementId}?ok=1`);
}

export async function addCoverageAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const quantity = String(formData.get("quantity") ?? "");
  const res = await addCoverage({
    requirement_id: requirementId,
    line_id: String(formData.get("line_id") ?? ""),
    oem_id: String(formData.get("oem_id") ?? ""),
    kind,
    quantity,
    delivery_date: String(formData.get("delivery_date") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!res.ok) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "coverage",
    entity_id: requirementId,
    action: "added",
    details: { kind, quantity },
  });
  redirect(`/requirements/${requirementId}?ok=1`);
}

export async function deleteCoverageAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const coverageId = String(formData.get("coverage_id") ?? "");
  const res = await deleteCoverage(coverageId);
  if (!res.ok) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "coverage",
    entity_id: coverageId,
    action: "removed",
  });
  redirect(`/requirements/${requirementId}?ok=1`);
}
