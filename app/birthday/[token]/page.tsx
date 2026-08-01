import { BirthdayForm } from "@/components/BirthdayForm";

export default async function BirthdayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-zinc-900">When&apos;s your birthday?</h1>
        <p className="text-sm text-zinc-500">
          Tell us and we&apos;ll send you a little treat from Kaho Ferments on the day.
        </p>
        <BirthdayForm token={token} />
      </div>
    </main>
  );
}
