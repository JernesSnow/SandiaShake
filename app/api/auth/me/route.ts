export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/getSessionProfile"; // adjust if needed

export async function GET() {
  try {
    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: perfil,
    });
  } catch (e: any) {
    console.error("AUTH ME ERROR:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Auth error" },
      { status: 500 }
    );
  }
}