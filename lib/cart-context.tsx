"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type CartLine = {
  key: string;
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
  notes: string;
};

const STORAGE_KEY = "fnb-cart-v1";
const EMPTY_LINES: CartLine[] = [];

// Module-level store (there is exactly one CartProvider, at the app root)
// backed by localStorage. Using useSyncExternalStore instead of an
// effect-driven useState avoids a hydration mismatch between the
// server-rendered (storage-less) markup and the client's persisted cart.
let state: CartLine[] = EMPTY_LINES;
let hydrated = false;
const listeners = new Set<() => void>();

function loadFromStorage(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setState(next: CartLine[]) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (e.g. private browsing) — cart still works in-memory.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  if (!hydrated) {
    state = loadFromStorage();
    hydrated = true;
  }
  return state;
}

function getServerSnapshot() {
  return EMPTY_LINES;
}

function lineKey(menuItemId: string, notes: string) {
  return `${menuItemId}::${notes}`;
}

function addLine(line: Omit<CartLine, "key">) {
  const key = lineKey(line.menuItemId, line.notes);
  const existing = state.find((l) => l.key === key);
  setState(
    existing
      ? state.map((l) => (l.key === key ? { ...l, qty: l.qty + line.qty } : l))
      : [...state, { ...line, key }]
  );
}

function updateQty(key: string, qty: number) {
  setState(
    qty <= 0
      ? state.filter((l) => l.key !== key)
      : state.map((l) => (l.key === key ? { ...l, qty } : l))
  );
}

function removeLine(key: string) {
  setState(state.filter((l) => l.key !== key));
}

function clear() {
  setState([]);
}

type CartContextValue = {
  lines: CartLine[];
  addLine: typeof addLine;
  updateQty: typeof updateQty;
  removeLine: typeof removeLine;
  clear: typeof clear;
  subtotal: number;
  count: number;
  /**
   * False until the client has read the real cart from localStorage. The
   * server-rendered pass (and the first client render, to avoid a hydration
   * mismatch) always sees an empty cart via getServerSnapshot — code that
   * treats "empty" as meaningful (e.g. redirecting away from checkout) must
   * wait for this to be true first, or it will act on that placeholder.
   */
  isHydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);
  const isHydrated = lines !== EMPTY_LINES;

  return (
    <CartContext.Provider
      value={{ lines, addLine, updateQty, removeLine, clear, subtotal, count, isHydrated }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
