import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "No auth" });

  await admin
    .from("usuarios")
    .update({ temp_password: false })
    .eq("auth_user_id", data.user.id);

  return NextResponse.json({ ok: true });
}
