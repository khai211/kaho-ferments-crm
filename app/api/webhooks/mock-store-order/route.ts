import { NextRequest, NextResponse } from "next/server";
import { handleOrderReceived } from "@/lib/crm/order-received";
import type { MockOrderPayload } from "@/lib/types";

// Quick local testing without a real HitPay sandbox/webhook/tunnel — accepts
// the same MockOrderPayload shape handleOrderReceived() expects directly.
// For the real thing, see app/api/webhooks/hitpay/route.ts.
export async function POST(request: NextRequest) {
  let body: MockOrderPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (
    !body.order_reference?.trim() ||
    !body.customer?.name?.trim() ||
    (!body.customer.email && !body.customer.phone) ||
    !Array.isArray(body.items) ||
    body.items.length === 0 ||
    typeof body.total !== "number" ||
    !body.paid_at
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const result = await handleOrderReceived(body, "mock_store");
    if ("alreadyProcessed" in result) {
      return NextResponse.json({ already_processed: true });
    }
    return NextResponse.json({
      customer_id: result.customer.id,
      order_reference: result.order.reference,
      sequence_scheduled: result.sequenceScheduled,
    });
  } catch (err) {
    console.error("[mock-store-order] failed to process order", err);
    return NextResponse.json({ error: "Could not process order" }, { status: 500 });
  }
}
