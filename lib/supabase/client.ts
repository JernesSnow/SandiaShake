import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient(persistSession: boolean = true) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession,
        autoRefreshToken: persistSession,
        detectSessionInUrl: true,
      },
    }
  );
}
