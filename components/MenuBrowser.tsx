"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { MenuItem } from "@/lib/types";
import { formatSGD } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { ItemModal } from "@/components/ItemModal";
import { CartSheet } from "@/components/CartSheet";

export function MenuBrowser({ items }: { items: MenuItem[] }) {
  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const item of items) {
      if (!seen.includes(item.category)) seen.push(item.category);
    }
    return seen;
  }, [items]);

  const [activeCategory, setActiveCategory] = useState(categories[0] ?? "");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { count, subtotal } = useCart();

  const visibleItems = items.filter((item) => item.category === activeCategory);

  if (items.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-zinc-500">
        No menu items yet. Check back soon.
      </p>
    );
  }

  return (
    <div>
      <nav className="sticky top-[49px] z-10 flex gap-2 overflow-x-auto border-b border-zinc-200 bg-white px-4 py-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              category === activeCategory
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {category}
          </button>
        ))}
      </nav>

      <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {visibleItems.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={!item.available}
              onClick={() => setSelectedItem(item)}
              className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition-opacity disabled:opacity-50"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-900">{item.name}</p>
                {item.description ? (
                  <p className="truncate text-sm text-zinc-500">{item.description}</p>
                ) : null}
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  {formatSGD(item.price)}
                </p>
              </div>
              {!item.available ? (
                <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600">
                  Sold out
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {selectedItem ? (
        <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      ) : null}

      {count > 0 ? (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-4 z-20 flex items-center justify-between rounded-full bg-zinc-900 px-5 py-3 text-white shadow-lg"
        >
          <span className="font-medium">View cart · {count} item{count === 1 ? "" : "s"}</span>
          <span className="font-semibold">{formatSGD(subtotal)}</span>
        </button>
      ) : null}

      {cartOpen ? <CartSheet onClose={() => setCartOpen(false)} /> : null}
    </div>
  );
}
