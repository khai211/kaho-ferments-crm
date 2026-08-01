"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20;

/**
 * While an order is still "pending", repeatedly asks
 * /api/order/[reference] for the live HitPay-confirmed status (see that
 * route) and refreshes the server-rendered confirmation page as soon as it
 * changes. Checks immediately on mount — the customer usually lands here
 * right after paying — then every POLL_INTERVAL_MS. Renders nothing itself.
 */
export function StatusPoller({
  reference,
  status,
}: {
  reference: string;
  status: string;
}) {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    if (status !== "pending") return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function check() {
      attempts.current += 1;

      try {
        const res = await fetch(`/api/order/${reference}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.status !== "pending") {
            router.refresh();
            return;
          }
        }
      } catch {
        // Transient network error — the next scheduled check will retry.
      }

      if (!cancelled && attempts.current < MAX_ATTEMPTS) {
        timeoutId = setTimeout(check, POLL_INTERVAL_MS);
      }
    }

    check();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [status, reference, router]);

  return null;
}
