"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatSGD } from "@/lib/format";

export default function CheckoutPage() {
  const { lines, subtotal, clear, isHydrated } = useCart();
  const router = useRouter();

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    // Wait for isHydrated: before that, `lines` is just the empty
    // server-render placeholder, not the real (possibly non-empty) cart.
    if (isHydrated && lines.length === 0 && !submitting) {
      router.replace("/");
    }
  }, [isHydrated, lines.length, submitting, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          customerName: name,
          customerContact: contact,
          tableNumber,
          items: lines.map((l) => ({
            menuItemId: l.menuItemId,
            qty: l.qty,
            notes: l.notes,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      clear();
      window.location.href = data.url;
    } catch {
      setError("Network error. Please check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (lines.length === 0) return null;

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white px-4 py-3">
        <Link href="/" className="text-sm text-zinc-500">
          ← Back to menu
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">Checkout</h1>
      </header>

      <div className="flex-1 p-4">
        <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-medium text-zinc-900">Order summary</h2>
          <ul className="space-y-2 text-sm">
            {lines.map((line) => (
              <li key={line.key} className="flex justify-between gap-3">
                <span className="text-zinc-700">
                  {line.qty} × {line.name}
                  {line.notes ? (
                    <span className="block text-xs text-zinc-400">{line.notes}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-zinc-900">
                  {formatSGD(line.price * line.qty)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-zinc-200 pt-3 font-semibold text-zinc-900">
            <span>Total</span>
            <span>{formatSGD(subtotal)}</span>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-zinc-700">
              Name
            </label>
            <input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 p-2.5 focus:border-zinc-900 focus:outline-none"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="contact" className="text-sm font-medium text-zinc-700">
              Phone or email
            </label>
            <input
              id="contact"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 p-2.5 focus:border-zinc-900 focus:outline-none"
              placeholder="For order updates"
            />
          </div>

          <div>
            <label htmlFor="table" className="text-sm font-medium text-zinc-700">
              Table number (optional)
            </label>
            <input
              id="table"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 p-2.5 focus:border-zinc-900 focus:outline-none"
              placeholder="e.g. 12"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-full bg-zinc-900 px-5 py-3 font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Starting payment…" : `Pay ${formatSGD(subtotal)} via PayNow`}
          </button>
        </form>
      </div>
    </main>
  );
}
