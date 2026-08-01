import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/hitpay";
import { handleOrderReceived } from "@/lib/crm/order-received";
import type { MockOrderPayload } from "@/lib/types";

// Real HitPay Event Webhook (API Keys > Event Webhook in the dashboard,
// order.created/order.updated events) — see README for sandbox setup.
// Field names below (phone_number, quantity, unit_price, etc.) come from
// HitPay's documented order.created example payload.
// fulfilment_type/slot_date/slot_time/pickup are from HitPay's documented
// example payload, but Kaho Ferments' sandbox store doesn't have
// pickup/delivery configured yet — these fields are read defensively
// (never block processing if absent/differently-shaped) until we can
// confirm the real shape against a live pickup and delivery order.
type HitPayOrderPayload = {
  id: string;
  payment_status: string;
  amount: number;
  closed_at: string | null;
  updated_at: string;
  created_at: string;
  fulfilment_type?: string | null;
  slot_date?: string | null;
  slot_time?: string | null;
  pickup?: { location_name?: string | null; address?: string | null } | null;
  customer: {
    name: string;
    email?: string | null;
    phone_number?: string | null;
    address?: {
      building?: string | null;
      street?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    } | null;
  };
  line_items: { name: string; quantity: number; unit_price: number }[];
};

function formatAddress(address: HitPayOrderPayload["customer"]["address"]): string | undefined {
  if (!address) return undefined;
  const parts = [address.building, address.street, address.city, address.state, address.postal_code, address.country].filter(
    (part): part is string => Boolean(part)
  );
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const salt = process.env.HITPAY_WEBHOOK_SALT;

  if (!salt) {
    console.error("[hitpay webhook] HITPAY_WEBHOOK_SALT is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  if (!verifyWebhookSignature(rawBody, request.headers.get("hitpay-signature"), salt)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Only "order" events carry the customer + line items this CRM needs.
  // Ack (2xx) anything else so HitPay doesn't retry it as a failure.
  if (request.headers.get("hitpay-event-object") !== "order") {
    return NextResponse.json({ ok: true });
  }

  let order: HitPayOrderPayload;
  try {
    order = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // order.created can fire before payment on some channels; only act once paid.
  if (order.payment_status !== "paid") {
    return NextResponse.json({ ok: true });
  }

  if (!order.customer?.email && !order.customer?.phone_number) {
    return NextResponse.json({ ok: true });
  }

  const payload: MockOrderPayload = {
    order_reference: order.id,
    customer: {
      name: order.customer.name,
      email: order.customer.email ?? undefined,
      phone: order.customer.phone_number ?? undefined,
      address: formatAddress(order.customer.address),
    },
    items: order.line_items.map((item) => ({
      name: item.name,
      qty: item.quantity,
      unit_price: item.unit_price,
    })),
    total: order.amount,
    paid_at: order.closed_at ?? order.updated_at ?? order.created_at,
    fulfilment: order.slot_date
      ? {
          type: order.fulfilment_type ?? undefined,
          date: order.slot_date,
          time: order.slot_time ?? undefined,
          location: order.pickup?.location_name ?? order.pickup?.address ?? undefined,
        }
      : undefined,
  };

  try {
    await handleOrderReceived(payload, "hitpay_store");
  } catch (err) {
    console.error("[hitpay webhook] failed to process order", err);
    return NextResponse.json({ error: "Could not process order" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
