"use server";

import { redirect } from "next/navigation";
import { updateStep, addPdi, addDelivery } from "@/lib/fulfilment";
import { addInvoice } from "@/lib/orders";
import {
  addPayment,
  createCommission,
  setCommissionStatus,
} from "@/lib/payments";
import { getSessionUser } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";

export async function updateStepAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");
  const step = String(formData.get("step") ?? "");
  const res = await updateStep(orderId, step, {
    owner: String(formData.get("owner") ?? ""),
    expected_date: String(formData.get("expected_date") ?? ""),
    completed_on: String(formData.get("completed_on") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!res.ok) {
    redirect(`/orders/${orderId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "fulfilment",
    entity_id: orderId,
    action: `step:${step}`,
  });
  redirect(`/orders/${orderId}?ok=1`);
}

export async function addPdiAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");
  const result = String(formData.get("result") ?? "pending");
  const res = await addPdi(orderId, {
    inspected_on: String(formData.get("inspected_on") ?? ""),
    qty_offered: String(formData.get("qty_offered") ?? ""),
    qty_cleared: String(formData.get("qty_cleared") ?? ""),
    qty_rejected: String(formData.get("qty_rejected") ?? ""),
    result,
    remarks: String(formData.get("remarks") ?? ""),
  });
  if (!res.ok) {
    redirect(`/orders/${orderId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "pdi",
    entity_id: orderId,
    action: result,
  });
  redirect(`/orders/${orderId}?ok=1`);
}

export async function addDeliveryAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");
  const res = await addDelivery(orderId, {
    delivered_on: String(formData.get("delivered_on") ?? ""),
    qty_delivered: String(formData.get("qty_delivered") ?? ""),
    status: String(formData.get("status") ?? "delivered"),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!res.ok) {
    redirect(`/orders/${orderId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "delivery",
    entity_id: orderId,
    action: "recorded",
  });
  redirect(`/orders/${orderId}?ok=1`);
}

export async function addOrderInvoiceAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");
  const invoiceNumber = String(formData.get("invoice_number") ?? "");
  const res = await addInvoice(orderId, {
    invoice_number: invoiceNumber,
    invoice_date: String(formData.get("invoice_date") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!res.ok) {
    redirect(`/orders/${orderId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "invoice",
    entity_id: orderId,
    action: "added",
    details: { invoice_number: invoiceNumber },
  });
  redirect(`/orders/${orderId}?ok=1`);
}

export async function addPaymentAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");
  const res = await addPayment(orderId, {
    invoice_id: String(formData.get("invoice_id") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    paid_on: String(formData.get("paid_on") ?? ""),
    mode: String(formData.get("mode") ?? ""),
    reference: String(formData.get("reference") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!res.ok) {
    redirect(`/orders/${orderId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "payment",
    entity_id: orderId,
    action: "recorded",
  });
  redirect(`/orders/${orderId}?ok=1`);
}

export async function createCommissionAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");
  const res = await createCommission(orderId, {
    oem_id: String(formData.get("oem_id") ?? ""),
    base_amount: String(formData.get("base_amount") ?? ""),
    commission_pct: String(formData.get("commission_pct") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!res.ok) {
    redirect(`/orders/${orderId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "commission",
    entity_id: orderId,
    action: "created",
  });
  redirect(`/orders/${orderId}?ok=1`);
}

export async function setCommissionStatusAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");
  const id = String(formData.get("commission_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const res = await setCommissionStatus(id, status);
  if (!res.ok) {
    redirect(`/orders/${orderId}?error=${encodeURIComponent(res.error)}`);
  }
  const user = await getSessionUser();
  await recordAudit({
    actor: user?.email ?? null,
    entity: "commission",
    entity_id: id,
    action: status,
  });
  redirect(`/orders/${orderId}?ok=1`);
}
