import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ verified: false }, { status: 401 });
    }

    const mfaCookie = req.cookies.get("ss_mfa_ok")?.value;
    const verified = mfaCookie === user.id;

    return NextResponse.json({ verified });
  } catch {
    return NextResponse.json({ verified: false }, { status: 500 });
  }
}
