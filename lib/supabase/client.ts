import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseClient(_keepLoggedIn: boolean = true) {

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
