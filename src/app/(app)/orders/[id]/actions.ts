"use server";

import { redirect } from "next/navigation";
import { updateStep, addPdi, addDelivery } from "@/lib/fulfilment";
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
