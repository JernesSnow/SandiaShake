export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";

/* =========================================================
   GET — List notes for an organization (internal notes)
   - Requires auth (non-CLIENTE)
   - Returns author (usuarios via explicit FK) + created_at
========================================================= */
export async function GET(req: NextRequest) {
  try {
    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Notes are "internas": don’t allow CLIENTE
    if (perfil.rol === "CLIENTE") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    if (perfil.estado !== "ACTIVO") {
      return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get("id_organizacion");

    if (!id) {
      return NextResponse.json(
        { error: "id_organizacion requerido" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // IMPORTANT:
    // organizacion_notas has 3 FKs to usuarios: id_usuario, created_by, updated_by.
    // So we MUST pick the intended FK explicitly to avoid ambiguity errors (500).
    const { data, error } = await supabase
      .from("organizacion_notas")
      .select(`
        id_nota,
        id_organizacion,
        id_usuario,
        nota,
        estado,
        created_at,
        autor:usuarios!fk_cliente_notas_usuario (
          id_usuario,
          nombre,
          correo
        )
      `)
      .eq("id_organizacion", Number(id))
      .eq("estado", "ACTIVO")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("organizacion_notas GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: any) {
    console.error("organizacion_notas GET catch:", e);
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST — Create internal note
   - Requires auth (non-CLIENTE)
   - Inserts id_usuario (NOT NULL) + created_by/updated_by
   - Returns author info using explicit FK
========================================================= */
export async function POST(req: NextRequest) {
  try {
    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Notes are "internas": don’t allow CLIENTE
    if (perfil.rol === "CLIENTE") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    if (perfil.estado !== "ACTIVO") {
      return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    }

    const body = await req.json();
    const { id_organizacion, nota } = body;

    if (!id_organizacion || !String(nota ?? "").trim()) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const payload = {
      id_organizacion: Number(id_organizacion),
      id_usuario: perfil.id_usuario, // ✅ REQUIRED by DB (NOT NULL)
      nota: String(nota).trim(),
      estado: "ACTIVO",
      created_by: perfil.id_usuario,
      updated_by: perfil.id_usuario,
    };

    const { data, error } = await supabase
      .from("organizacion_notas")
      .insert(payload)
      .select(`
        id_nota,
        id_organizacion,
        id_usuario,
        nota,
        estado,
        created_at,
        autor:usuarios!fk_cliente_notas_usuario (
          id_usuario,
          nombre,
          correo
        )
      `)
      .single();

    if (error) {
      console.error("organizacion_notas POST error:", error, "payload:", payload);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e: any) {
    console.error("organizacion_notas POST catch:", e);
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE — Soft delete note (ADMIN only)
   - ?id_nota=123
========================================================= */
export async function DELETE(req: NextRequest) {
  try {
    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (perfil.estado !== "ACTIVO") {
      return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
    }

    if (perfil.rol !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const idNota = Number(req.nextUrl.searchParams.get("id_nota"));

    if (!idNota) {
      return NextResponse.json({ error: "id_nota requerido" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from("organizacion_notas")
      .update({
        estado: "ELIMINADO",
        updated_by: perfil.id_usuario,
        updated_at: new Date().toISOString(),
      })
      .eq("id_nota", idNota);

    if (error) {
      console.error("organizacion_notas DELETE error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("organizacion_notas DELETE catch:", e);
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}