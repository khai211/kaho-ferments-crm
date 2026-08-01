import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPaymentRequest, mapHitPayStatus } from "@/lib/hitpay";

// Polled by components/StatusPoller.tsx. This is the source of truth for
// payment status: rather than waiting on a webhook, it asks HitPay directly
// for the current state of the payment request and persists it if changed.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;
  const supabase = createAdminSupabaseClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("status, hitpay_payment_request_id")
    .eq("reference", reference)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "pending" || !order.hitpay_payment_request_id) {
    return NextResponse.json({ status: order.status });
  }

  try {
    const paymentRequest = await getPaymentRequest(order.hitpay_payment_request_id);
    const status = mapHitPayStatus(paymentRequest.status);

    if (status !== "pending") {
      await supabase.from("orders").update({ status }).eq("reference", reference);
    }

    return NextResponse.json({ status });
  } catch {
    // HitPay lookup failed transiently — report the last known status
    // rather than erroring the poll; the client will just try again.
    return NextResponse.json({ status: order.status });
  }
}
