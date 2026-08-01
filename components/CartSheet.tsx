"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatSGD } from "@/lib/format";

export function CartSheet({ onClose }: { onClose: () => void }) {
  const { lines, updateQty, removeLine, subtotal } = useCart();

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 p-4">
          <h2 className="text-lg font-semibold text-zinc-900">Your order</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-700"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {lines.length === 0 ? (
            <p className="text-sm text-zinc-500">Your cart is empty.</p>
          ) : (
            <ul className="space-y-4">
              {lines.map((line) => (
                <li key={line.key} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900">{line.name}</p>
                    {line.notes ? (
                      <p className="text-sm text-zinc-500">{line.notes}</p>
                    ) : null}
                    <p className="text-sm text-zinc-500">{formatSGD(line.price)} each</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQty(line.key, line.qty - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-sm"
                        aria-label={`Decrease quantity of ${line.name}`}
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-medium">{line.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(line.key, line.qty + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-sm"
                        aria-label={`Increase quantity of ${line.name}`}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="text-xs text-zinc-400 underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 ? (
          <div className="border-t border-zinc-200 p-4">
            <div className="mb-3 flex items-center justify-between font-semibold text-zinc-900">
              <span>Subtotal</span>
              <span>{formatSGD(subtotal)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={onClose}
              className="flex w-full items-center justify-center rounded-full bg-zinc-900 px-5 py-3 font-medium text-white"
            >
              Proceed to checkout
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
