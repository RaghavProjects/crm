"use server";

import { redirect } from "next/navigation";
import { shortlistOem, logResponse } from "@/lib/sourcing";
import { addCoverage, deleteCoverage } from "@/lib/coverage";
import { createQuote, approveQuote, type NewQuoteLine } from "@/lib/quotes";
import { createOrderFromQuote, addInvoice } from "@/lib/orders";
import { updateRequirementStatus } from "@/lib/requirements";
import { getSessionUser } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";

export async function setStatusAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const res = await updateRequirementStatus(
    requirementId,
    status,
    String(formData.get("loss_reason") ?? ""),
    String(formData.get("loss_notes") ?? ""),
  );
  if (!res.ok) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "requirement",
    entity_id: requirementId,
    action: `status:${status}`,
  });
  redirect(`/requirements/${requirementId}?ok=1`);
}

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

export async function createQuoteAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  let lines: NewQuoteLine[] = [];
  try {
    lines = JSON.parse(String(formData.get("quote_lines") ?? "[]"));
  } catch {
    lines = [];
  }
  const target = String(formData.get("target_margin_pct") ?? "");
  const res = await createQuote(requirementId, {
    target_margin_pct: target,
    notes: String(formData.get("notes") ?? ""),
    lines,
  });
  if (!res.ok) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "quote",
    entity_id: requirementId,
    action: "created",
    details: { target_margin_pct: target || null },
  });
  redirect(`/requirements/${requirementId}?ok=1`);
}

export async function approveQuoteAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const quoteId = String(formData.get("quote_id") ?? "");
  const user = await getSessionUser();
  const res = await approveQuote(quoteId, user?.email ?? null);
  if (!res.ok) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(res.error)}`);
  }
  await recordAudit({
    actor: user?.email ?? null,
    entity: "quote",
    entity_id: quoteId,
    action: "approved",
  });
  redirect(`/requirements/${requirementId}?ok=1`);
}

export async function createOrderAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const po = String(formData.get("po_number") ?? "");
  const res = await createOrderFromQuote(requirementId, {
    quote_id: String(formData.get("quote_id") ?? ""),
    po_number: po,
    po_date: String(formData.get("po_date") ?? ""),
    delivery_deadline: String(formData.get("delivery_deadline") ?? ""),
    oem_id: String(formData.get("oem_id") ?? ""),
    supplier_po: String(formData.get("supplier_po") ?? ""),
    pdi_required: formData.get("pdi_required") === "on",
    notes: String(formData.get("notes") ?? ""),
  });
  if (!res.ok) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "order",
    entity_id: requirementId,
    action: "created",
    details: { po_number: po },
  });
  redirect(`/requirements/${requirementId}?ok=1`);
}

export async function addInvoiceAction(formData: FormData) {
  const requirementId = String(formData.get("requirement_id") ?? "");
  const orderId = String(formData.get("order_id") ?? "");
  const invoiceNumber = String(formData.get("invoice_number") ?? "");
  const res = await addInvoice(orderId, {
    invoice_number: invoiceNumber,
    invoice_date: String(formData.get("invoice_date") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!res.ok) {
    redirect(`/requirements/${requirementId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "invoice",
    entity_id: orderId,
    action: "added",
    details: { invoice_number: invoiceNumber },
  });
  redirect(`/requirements/${requirementId}?ok=1`);
}
