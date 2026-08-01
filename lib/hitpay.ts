import "server-only";
import crypto from "node:crypto";

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
