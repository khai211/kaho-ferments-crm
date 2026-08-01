import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/mailer";
import { renderTemplate } from "@/lib/email/render";
import { buildMergeVars } from "@/lib/crm/merge-vars";
import type { Customer, MockOrderPayload } from "@/lib/types";

/**
 * Upserts the customer, records the order, and schedules (immediately
 * sending any delay_days = 0 step) the active email sequence. Customers
 * without an email are recorded but skip sequence scheduling entirely —
 * email is the only channel for now.
 *
 * Idempotent on `order_reference`: HitPay's real event webhook can fire
 * order.created and order.updated for the same paid order, and either
 * could retry on a non-2xx response — a repeat is a no-op, not an error.
 */
export async function handleOrderReceived(
  payload: MockOrderPayload,
  source: "mock_store" | "hitpay_store" = "mock_store"
) {
  const { customer: customerInput, items, total, order_reference, paid_at } = payload;
  const supabase = createAdminSupabaseClient();

  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("reference", order_reference)
    .maybeSingle();
  if (existingOrder) {
    return { alreadyProcessed: true as const };
  }

  let existing: Customer | null = null;
  if (customerInput.email) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .ilike("email", customerInput.email)
      .maybeSingle();
    existing = data;
  }
  if (!existing && customerInput.phone) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", customerInput.phone)
      .maybeSingle();
    existing = data;
  }

  let customer: Customer;
  if (existing) {
    const { data, error } = await supabase
      .from("customers")
      .update({
        name: customerInput.name || existing.name,
        email: customerInput.email || existing.email,
        phone: customerInput.phone || existing.phone,
        address: customerInput.address || existing.address,
        order_count: existing.order_count + 1,
        last_order_at: paid_at,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Could not update customer");
    customer = data;
  } else {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: customerInput.name,
        email: customerInput.email,
        phone: customerInput.phone,
        address: customerInput.address,
        order_count: 1,
        first_order_at: paid_at,
        last_order_at: paid_at,
      })
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Could not create customer");
    customer = data;
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      reference: order_reference,
      customer_name: customerInput.name,
      customer_contact: customerInput.email ?? customerInput.phone ?? "",
      total,
      status: "paid",
      idempotency_key: order_reference,
      customer_id: customer.id,
      source,
      fulfilment_type: payload.fulfilment?.type,
      fulfilment_date: payload.fulfilment?.date,
      fulfilment_time: payload.fulfilment?.time,
      fulfilment_location: payload.fulfilment?.location,
    })
    .select("*")
    .single();
  if (orderError || !order) throw orderError ?? new Error("Could not create order");

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        item_name: item.name,
        unit_price: item.unit_price,
        qty: item.qty,
      }))
    );
    if (itemsError) throw itemsError;
  }

  if (!customer.email) {
    return { customer, order, sequenceScheduled: false };
  }

  const { data: steps, error: stepsError } = await supabase
    .from("sequence_steps")
    .select("*")
    .eq("active", true)
    .eq("is_birthday", false)
    .order("step_order");
  if (stepsError) throw stepsError;

  const paidAtMs = new Date(paid_at).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const mergeVars = buildMergeVars({
    customer,
    order: { reference: order.reference },
    items,
    fulfilment: { date: order.fulfilment_date, time: order.fulfilment_time, location: order.fulfilment_location },
  });

  for (const step of steps ?? []) {
    let dueAt: string;
    if (step.anchor === "fulfilment_date") {
      // No slot on this order (e.g. it wasn't a scheduled pickup/delivery) — nothing to remind about.
      if (!order.fulfilment_date) continue;
      dueAt = new Date(new Date(`${order.fulfilment_date}T00:00:00Z`).getTime() + step.delay_days * dayMs).toISOString();
    } else {
      dueAt = new Date(paidAtMs + step.delay_days * dayMs).toISOString();
    }

    const { data: send, error: sendError } = await supabase
      .from("sequence_sends")
      .insert({ order_id: order.id, step_id: step.id, customer_id: customer.id, due_at: dueAt })
      .select("id")
      .single();
    if (sendError || !send) throw sendError ?? new Error("Could not schedule sequence step");

    if (step.delay_days === 0) {
      await sendEmail({
        to: customer.email,
        subject: renderTemplate(step.subject, mergeVars),
        text: renderTemplate(step.body, mergeVars),
      });
      await supabase
        .from("sequence_sends")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", send.id);
    }
  }

  return { customer, order, sequenceScheduled: true };
}
