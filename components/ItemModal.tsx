"use client";

import { useState } from "react";
import Image from "next/image";
import type { MenuItem } from "@/lib/types";
import { formatSGD } from "@/lib/format";
import { useCart } from "@/lib/cart-context";

export function ItemModal({
  item,
  onClose,
}: {
  item: MenuItem;
  onClose: () => void;
}) {
  const { addLine } = useCart();
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  function handleAdd() {
    addLine({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      qty,
      notes: notes.trim(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="relative h-40 w-full bg-zinc-100">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="448px"
              className="object-cover"
              unoptimized
            />
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          <h2 className="text-lg font-semibold text-zinc-900">{item.name}</h2>
          {item.description ? (
            <p className="mt-1 text-sm text-zinc-500">{item.description}</p>
          ) : null}
          <p className="mt-2 font-semibold text-zinc-900">{formatSGD(item.price)}</p>

          <div className="mt-4">
            <label htmlFor="item-notes" className="text-sm font-medium text-zinc-700">
              Special requests (optional)
            </label>
            <textarea
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. less spicy, no onions"
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-lg"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-6 text-center font-medium">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-lg"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              className="rounded-full bg-zinc-900 px-6 py-2.5 font-medium text-white"
            >
              Add · {formatSGD(item.price * qty)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
