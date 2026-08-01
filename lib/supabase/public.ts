import { createClient } from "@supabase/supabase-js";

/**
 * Anon-key client for public, read-only access (menu_items). Safe to use
 * from Server Components or Client Components — RLS restricts it to
 * whatever the "menu_items are publicly readable" policy allows.
 */
export function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set"
    );
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}
