"use client";

import { useState, type FormEvent } from "react";

export function BirthdayForm({ token }: { token: string }) {
  const [birthday, setBirthday] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/birthday/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthday }),
    });

    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return <p className="text-sm text-emerald-600">Thanks — we&apos;ll remember it!</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="date"
        required
        value={birthday}
        onChange={(e) => setBirthday(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 p-2.5 focus:border-zinc-900 focus:outline-none"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-zinc-900 px-5 py-2.5 font-medium text-white disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
