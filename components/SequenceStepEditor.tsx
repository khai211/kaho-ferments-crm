"use client";

import { useState } from "react";
import type { SequenceStep } from "@/lib/types";

export function SequenceStepEditor({ step }: { step: SequenceStep }) {
  const [subject, setSubject] = useState(step.subject);
  const [body, setBody] = useState(step.body);
  const [delayDays, setDelayDays] = useState(step.delay_days);
  const [active, setActive] = useState(step.active);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch(`/api/admin/sequence-steps/${step.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, delay_days: delayDays, active }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save.");
      return;
    }
    setSaved(true);
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium text-zinc-900">
          {step.name}
          {step.is_birthday ? (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              birthday
            </span>
          ) : null}
        </h2>
        <label className="flex items-center gap-1.5 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => {
              setActive(e.target.checked);
              setSaved(false);
            }}
          />
          Active
        </label>
      </div>

      {!step.is_birthday ? (
        <div>
          <label className="text-sm font-medium text-zinc-700">
            {step.anchor === "fulfilment_date"
              ? "Send before pickup/delivery (days, e.g. -1)"
              : "Send after purchase (days)"}
          </label>
          <input
            type="number"
            value={delayDays}
            onChange={(e) => {
              setDelayDays(Number(e.target.value));
              setSaved(false);
            }}
            className="mt-1 w-24 rounded-lg border border-zinc-300 p-2 focus:border-zinc-900 focus:outline-none"
          />
        </div>
      ) : null}

      <div>
        <label className="text-sm font-medium text-zinc-700">Subject</label>
        <input
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setSaved(false);
          }}
          className="mt-1 w-full rounded-lg border border-zinc-300 p-2.5 focus:border-zinc-900 focus:outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700">Body</label>
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setSaved(false);
          }}
          rows={6}
          className="mt-1 w-full rounded-lg border border-zinc-300 p-2.5 font-mono text-sm focus:border-zinc-900 focus:outline-none"
        />
        <p className="mt-1 text-xs text-zinc-400">
          Merge tags: {"{{first_name}}"}, {"{{flavor}}"}, {"{{order_reference}}"}, {"{{birthday_link}}"},{" "}
          {"{{pickup_date}}"}, {"{{pickup_time}}"}, {"{{pickup_location}}"}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved ? <span className="text-sm text-emerald-600">Saved</span> : null}
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
      </div>
    </section>
  );
}
