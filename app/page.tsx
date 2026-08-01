import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { MOCK_MENU_ITEMS } from "@/lib/mock-menu";
import { MenuBrowser } from "@/components/MenuBrowser";
import type { MenuItem } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadMenu(): Promise<{ items: MenuItem[]; isMock: boolean }> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, name, description, price, category, image, available")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error || !data) {
      return { items: MOCK_MENU_ITEMS, isMock: true };
    }

    return {
      items: data.map((row) => ({ ...row, price: Number(row.price) })),
      isMock: false,
    };
  } catch {
    // Supabase env vars not set yet — fall back to sample data so the UI
    // is still browsable before a real project is connected.
    return { items: MOCK_MENU_ITEMS, isMock: true };
  }
}

export default async function HomePage() {
  const { items, isMock } = await loadMenu();

  return (
    <main className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-zinc-900">Order Menu</h1>
      </header>

      {isMock ? (
        <p className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
          Showing sample menu — connect Supabase to use your real menu and
          checkout. See README.md.
        </p>
      ) : null}

      <MenuBrowser items={items} />
    </main>
  );
}
