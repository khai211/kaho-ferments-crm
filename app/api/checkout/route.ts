import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createPaymentRequest } from "@/lib/hitpay";

type CheckoutItem = { menuItemId: string; qty: number; notes: string };

type CheckoutBody = {
  idempotencyKey: string;
  customerName: string;
  customerContact: string;
  tableNumber?: string;
  items: CheckoutItem[];
};

const REFERENCE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateReference() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += REFERENCE_CHARS[Math.floor(Math.random() * REFERENCE_CHARS.length)];
  }
  return `ORD-${code}`;
}

export async function POST(request: NextRequest) {
  let body: CheckoutBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (
    !body.idempotencyKey ||
    !body.customerName?.trim() ||
    !body.customerContact?.trim() ||
    !Array.isArray(body.items) ||
    body.items.length === 0
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // A menuItemId that isn't a UUID can't be a real row (e.g. a stale cart
  // entry from before the client was pointed at this Supabase project, or a
  // tampered request). Reject it the same way as "no longer available"
  // instead of letting the malformed value blow up the `.in("id", ...)`
  // query below with a generic 500.
  if (body.items.some((line) => !UUID_RE.test(line.menuItemId))) {
    return NextResponse.json(
      { error: "One or more items are no longer available" },
      { status: 409 }
    );
  }

  const supabase = createAdminSupabaseClient();

  // Idempotency: if this key already produced an order with a payment link,
  // hand back the same link instead of creating a duplicate order/payment.
  const { data: existing } = await supabase
    .from("orders")
    .select("reference, hitpay_url")
    .eq("idempotency_key", body.idempotencyKey)
    .maybeSingle();

  if (existing?.hitpay_url) {
    return NextResponse.json({ reference: existing.reference, url: existing.hitpay_url });
  }

  const menuItemIds = [...new Set(body.items.map((i) => i.menuItemId))];
  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id, name, price, available")
    .in("id", menuItemIds);

  if (menuError || !menuItems) {
    return NextResponse.json({ error: "Could not verify menu items" }, { status: 500 });
  }

  const menuById = new Map(menuItems.map((item) => [item.id, { ...item, price: Number(item.price) }]));

  for (const line of body.items) {
    const item = menuById.get(line.menuItemId);
    if (!item || !item.available || !Number.isInteger(line.qty) || line.qty < 1) {
      return NextResponse.json(
        { error: "One or more items are no longer available" },
        { status: 409 }
      );
    }
  }

  // Total is computed server-side from current DB prices — the client's
  // numbers are never trusted for the amount actually charged.
  const total = body.items.reduce(
    (sum, line) => sum + menuById.get(line.menuItemId)!.price * line.qty,
    0
  );

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      reference: generateReference(),
      customer_name: body.customerName.trim(),
      customer_contact: body.customerContact.trim(),
      table_number: body.tableNumber?.trim() || null,
      total,
      status: "pending",
      idempotency_key: body.idempotencyKey,
    })
    .select("id, reference")
    .single();

  if (orderError || !order) {
    // Unique violation on idempotency_key means a concurrent request (e.g. a
    // double-tap that got past the disabled button) already created the
    // order — fetch and return that one instead of erroring.
    if (orderError?.code === "23505") {
      const { data: raced } = await supabase
        .from("orders")
        .select("reference, hitpay_url")
        .eq("idempotency_key", body.idempotencyKey)
        .maybeSingle();
      if (raced?.hitpay_url) {
        return NextResponse.json({ reference: raced.reference, url: raced.hitpay_url });
      }
    }
    return NextResponse.json({ error: "Could not create order" }, { status: 500 });
  }

  const orderItemsPayload = body.items.map((line) => {
    const item = menuById.get(line.menuItemId)!;
    return {
      order_id: order.id,
      menu_item_id: item.id,
      item_name: item.name,
      unit_price: item.price,
      qty: line.qty,
      notes: line.notes?.trim() || null,
    };
  });

  const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);
  if (itemsError) {
    return NextResponse.json({ error: "Could not save order items" }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const isEmail = body.customerContact.includes("@");

  try {
    const paymentRequest = await createPaymentRequest({
      amount: total,
      currency: "SGD",
      name: body.customerName.trim(),
      email: isEmail ? body.customerContact.trim() : undefined,
      phone: isEmail ? undefined : body.customerContact.trim(),
      referenceNumber: order.reference,
      redirectUrl: `${origin}/order/${order.reference}`,
    });

    await supabase
      .from("orders")
      .update({
        hitpay_payment_request_id: paymentRequest.id,
        hitpay_url: paymentRequest.url,
      })
      .eq("id", order.id);

    return NextResponse.json({ reference: order.reference, url: paymentRequest.url });
  } catch {
    await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
    return NextResponse.json(
      { error: "Could not start payment. Please try again." },
      { status: 502 }
    );
  }
}
