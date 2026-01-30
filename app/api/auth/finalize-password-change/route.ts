import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No auth" }, { status: 401 });
  }

  const { error } = await admin
    .from("usuarios")
    .update({
      temp_password: false,
      force_password_change: false,
    })
    .eq("auth_user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
