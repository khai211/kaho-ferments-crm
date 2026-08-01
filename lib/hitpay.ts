import "server-only";
import crypto from "node:crypto";
import type { OrderStatus } from "@/lib/types";

function hitpayIsProduction() {
  return process.env.HITPAY_ENV === "production";
}

export function hitpayApiBase() {
  return hitpayIsProduction()
    ? "https://api.hit-pay.com"
    : "https://api.sandbox.hit-pay.com";
}

type CreatePaymentRequestParams = {
  amount: number;
  currency: string;
  name: string;
  email?: string;
  phone?: string;
  referenceNumber: string;
  redirectUrl: string;
};

export type HitPayPaymentRequest = {
  id: string;
  url: string;
  status: string;
};

/**
 * Creates a hosted payment request. Server-side only — requires the
 * business API key, which must never reach the browser.
 *
 * No `webhook` param: HitPay validates that field as a publicly reachable
 * URL and rejects "localhost", which breaks local dev. Payment status is
 * instead read back on demand with getPaymentRequest() (see
 * app/api/order/[reference]/route.ts) — an outbound call our server makes,
 * so it works the same on localhost as in production.
 */
export async function createPaymentRequest(
  params: CreatePaymentRequestParams
): Promise<HitPayPaymentRequest> {
  const apiKey = process.env.HITPAY_API_KEY;
  if (!apiKey) {
    throw new Error("HITPAY_API_KEY is not set");
  }

  const res = await fetch(`${hitpayApiBase()}/v1/payment-requests`, {
    method: "POST",
    headers: {
      "X-BUSINESS-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amount.toFixed(2),
      currency: params.currency,
      name: params.name,
      email: params.email,
      phone: params.phone,
      reference_number: params.referenceNumber,
      redirect_url: params.redirectUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HitPay payment request failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Looks up the current status of a previously created payment request.
 * This is the polling equivalent of the webhook — called from
 * app/api/order/[reference]/route.ts whenever an order is still "pending".
 */
export async function getPaymentRequest(id: string): Promise<HitPayPaymentRequest> {
  const apiKey = process.env.HITPAY_API_KEY;
  if (!apiKey) {
    throw new Error("HITPAY_API_KEY is not set");
  }

  const res = await fetch(`${hitpayApiBase()}/v1/payment-requests/${id}`, {
    headers: { "X-BUSINESS-API-KEY": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HitPay payment request lookup failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Verifies an Event Webhook request (API Keys > Event Webhook in the HitPay
 * dashboard — the `order.*`/`charge.*` webhook, distinct from the
 * payment-request `webhook` param). HitPay signs the *raw* request body with
 * HMAC-SHA256 using that webhook's salt, sent in the Hitpay-Signature header.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null, salt: string): boolean {
  if (!signature) return false;

  const expected = Buffer.from(crypto.createHmac("sha256", salt).update(rawBody).digest("hex"));
  const actual = Buffer.from(signature);

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** Maps a HitPay payment-request status onto this app's order status. */
export function mapHitPayStatus(status: string | undefined): OrderStatus {
  switch (status) {
    case "completed":
      return "paid";
    case "failed":
      return "failed";
    case "expired":
      return "expired";
    case "canceled":
      return "cancelled";
    default:
      return "pending";
  }
}
