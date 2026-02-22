export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createOrgDriveFolder } from "@/lib/google-drive/folders";

type Body = {
  nombre: string;
  correo?: string;
  telefono?: string;
  pais?: string;
  ciudad?: string;
  canton?: string;
  descripcion?: string;
};

/* =========================================================
   GET
   - CLIENTE → returns their organization (if exists)
   - ADMIN/COLABORADOR → treated as NOT needing org setup
========================================================= */
export async function GET(req: Request) {
  try {
    const perfil = await getSessionProfile();
    if (!perfil) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("id_organizacion");

    /* =========================================
       1️⃣ If id_organizacion is provided
       ADMIN / COLABORADOR / CLIENTE (guarded)
    ========================================= */
    if (orgIdParam) {
      const orgId = Number(orgIdParam);

      // CLIENTE can only access their own org
      if (perfil.rol === "CLIENTE") {
        const { data: link } = await admin
          .from("organizacion_usuario")
          .select("id_organizacion")
          .eq("id_usuario_cliente", perfil.id_usuario)
          .eq("id_organizacion", orgId)
          .maybeSingle();

        if (!link) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      const { data: org, error } = await admin
        .from("organizaciones")
        .select("*")
        .eq("id_organizacion", orgId)
        .maybeSingle();

      if (error || !org) {
        return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
      }

      return NextResponse.json({ organizacion: org });
    }

    /* =========================================
       2️⃣ Fallback: CLIENTE auto-lookup
    ========================================= */
    if (perfil.rol === "CLIENTE") {
      const { data: link } = await admin
        .from("organizacion_usuario")
        .select(`id_organizacion, organizaciones(*)`)
        .eq("id_usuario_cliente", perfil.id_usuario)
        .limit(1)
        .maybeSingle();

      if (!link?.organizaciones) {
        return NextResponse.json({
          hasOrg: false,
          organizacion: null,
        });
      }

      return NextResponse.json({
        hasOrg: true,
        organizacion: link.organizaciones,
      });
    }

    /* =========================================
       3️⃣ ADMIN / COLABORADOR fallback
    ========================================= */
    return NextResponse.json({
      hasOrg: true,
      organizacion: null,
    });

  } catch (e: any) {
    console.error("GET /api/organizacion error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST
   - Only CLIENTE can create
   - One organization per client
========================================================= */
export async function POST(req: Request) {
  try {
    const perfil = await getSessionProfile();

    if (!perfil) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    if (perfil.rol !== "CLIENTE") {
      return NextResponse.json(
        { error: "Solo usuarios CLIENTE pueden crear organizaciones" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as Body;
    const nombre = (body.nombre ?? "").trim();

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre de la organización es obligatorio" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    /* Prevent multiple orgs */
    const { data: existing } = await admin
      .from("organizacion_usuario")
      .select("id_organizacion")
      .eq("id_usuario_cliente", perfil.id_usuario)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Ya tienes una organización vinculada" },
        { status: 409 }
      );
    }

    /* Create organization */
    const { data: org, error: orgErr } = await admin
      .from("organizaciones")
      .insert({
        nombre,
        pais: body.pais?.trim() || null,
        ciudad: body.ciudad?.trim() || null,
        canton: body.canton?.trim() || null,
        telefono: body.telefono?.trim() || null,
        correo: body.correo?.trim() || null,
        descripcion: body.descripcion?.trim() || null,
      })
      .select("id_organizacion, nombre")
      .single();

    if (orgErr || !org) {
      console.error("Error creating org:", orgErr);
      return NextResponse.json(
        { error: orgErr?.message ?? "Error al crear organización" },
        { status: 500 }
      );
    }

    /* Link CLIENTE to organization */
    const { error: linkErr } = await admin
      .from("organizacion_usuario")
      .insert({
        id_organizacion: org.id_organizacion,
        id_usuario_cliente: perfil.id_usuario,
      });

    if (linkErr) {
      console.error("Error linking org:", linkErr);

      // Rollback
      await admin
        .from("organizaciones")
        .delete()
        .eq("id_organizacion", org.id_organizacion);

      return NextResponse.json(
        { error: linkErr.message },
        { status: 500 }
      );
    }

    /* Create Drive folder (non-blocking) */
    try {
      await createOrgDriveFolder(nombre, org.id_organizacion);
    } catch (driveErr) {
      console.error("[Drive] Failed to create org folder:", driveErr);
    }

    return NextResponse.json(
      { ok: true, organizacion: org },
      { status: 201 }
    );

  } catch (e: any) {
    console.error("POST /api/organizacion error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Error interno del servidor" },
      { status: 500 }
    );
  }
}