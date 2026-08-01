import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatSGD } from "@/lib/format";
import { StatusPoller } from "@/components/StatusPoller";
import type { OrderStatus } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Awaiting payment confirmation",
  paid: "Payment confirmed",
  failed: "Payment failed",
  cancelled: "Payment cancelled",
  expired: "Payment link expired",
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-zinc-200 text-zinc-700",
  expired: "bg-zinc-200 text-zinc-700",
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const supabase = createAdminSupabaseClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, reference, customer_name, table_number, total, status, created_at")
    .eq("reference", reference)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("item_name, unit_price, qty, notes")
    .eq("order_id", order.id);

  const status = order.status as OrderStatus;

  return (
    <main className="flex flex-1 flex-col items-center p-4">
      <StatusPoller reference={order.reference} status={status} />

      <div className="w-full max-w-md">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center">
          <p className="text-sm text-zinc-500">Order reference</p>
          <p className="text-2xl font-semibold tracking-wide text-zinc-900">
            {order.reference}
          </p>
          <span
            className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLE[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>
          {status === "pending" ? (
            <p className="mt-2 text-xs text-zinc-400">
              This page updates automatically once payment is confirmed.
            </p>
          ) : null}
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-5">
          <dl className="mb-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Name</dt>
              <dd className="text-zinc-900">{order.customer_name}</dd>
            </div>
            {order.table_number ? (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Table</dt>
                <dd className="text-zinc-900">{order.table_number}</dd>
              </div>
            ) : null}
          </dl>

          <ul className="space-y-2 border-t border-zinc-200 pt-3 text-sm">
            {(items ?? []).map((item, index) => (
              <li key={index} className="flex justify-between gap-3">
                <span className="text-zinc-700">
                  {item.qty} × {item.item_name}
                  {item.notes ? (
                    <span className="block text-xs text-zinc-400">{item.notes}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-zinc-900">
                  {formatSGD(Number(item.unit_price) * item.qty)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex justify-between border-t border-zinc-200 pt-3 font-semibold text-zinc-900">
            <span>Total</span>
            <span>{formatSGD(Number(order.total))}</span>
          </div>
        </div>

        <Link
          href="/"
          className="mt-4 flex w-full items-center justify-center rounded-full border border-zinc-300 px-5 py-3 font-medium text-zinc-900"
        >
          Back to menu
        </Link>
      </div>
    </main>
  );
}
