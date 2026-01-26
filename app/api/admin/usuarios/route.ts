import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createSupabaseAdmin();

  const { data, error } = await admin
    .from("usuarios")
    .select("*")
    .order("id_usuario");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ usuarios: data });
}
