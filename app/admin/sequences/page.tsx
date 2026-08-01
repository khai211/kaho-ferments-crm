import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { SequenceStepEditor } from "@/components/SequenceStepEditor";
import type { SequenceStep } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminSequencesPage() {
  const supabase = createAdminSupabaseClient();
  const { data: steps } = await supabase
    .from("sequence_steps")
    .select("*")
    .order("step_order")
    .returns<SequenceStep[]>();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <header>
        <h1 className="text-lg font-semibold text-zinc-900">Email sequence</h1>
        <p className="text-sm text-zinc-500">
          Edit what goes out after a purchase, and the birthday reward.
        </p>
      </header>

      {(steps ?? []).map((step) => (
        <SequenceStepEditor key={step.id} step={step} />
      ))}
    </main>
  );
}
