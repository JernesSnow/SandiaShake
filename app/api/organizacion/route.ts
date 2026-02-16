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

/**
 * GET — Check if the current CLIENTE user has a linked organization.
 * Returns { hasOrg: boolean, correo?: string }
 */
export async function GET() {
  try {
    const perfil = await getSessionProfile();
    if (!perfil) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Non-CLIENTE users don't need an org check
    if (perfil.rol !== "CLIENTE") {
      return NextResponse.json({ hasOrg: true });
    }

    const admin = createSupabaseAdmin();

    // Get user email for pre-filling
    const { data: usuario } = await admin
      .from("usuarios")
      .select("correo")
      .eq("id_usuario", perfil.id_usuario)
      .single();

    const { data: orgLink } = await admin
      .from("organizacion_usuario")
      .select("id_organizacion")
      .eq("id_usuario_cliente", perfil.id_usuario)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      hasOrg: !!orgLink,
      correo: usuario?.correo ?? null,
    });
  } catch (e: unknown) {
    console.error("Error in GET /api/organizacion:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error interno" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const perfil = await getSessionProfile();
    if (!perfil) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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

    // Check if user already has an org
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

    // Insert organization
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

    // Link user to organization
    const { error: linkErr } = await admin
      .from("organizacion_usuario")
      .insert({
        id_organizacion: org.id_organizacion,
        id_usuario_cliente: perfil.id_usuario,
      });

    if (linkErr) {
      console.error("Error linking user to org:", linkErr);
      // Cleanup: delete the org we just created
      await admin
        .from("organizaciones")
        .delete()
        .eq("id_organizacion", org.id_organizacion);
      return NextResponse.json(
        { error: linkErr.message },
        { status: 500 }
      );
    }

    // Create Google Drive folder (non-blocking — don't fail the request if Drive is unavailable)
    try {
      await createOrgDriveFolder(nombre, org.id_organizacion);
    } catch (driveErr) {
      console.error("[Drive] Failed to create org folder:", driveErr);
    }

    return NextResponse.json({ ok: true, organizacion: org }, { status: 201 });
  } catch (e: unknown) {
    console.error("Error in POST /api/organizacion:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}
