import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type EstadoFactura = "PENDIENTE" | "PARCIAL" | "PAGADA" | "VENCIDA";

async function getPerfilAdmin() {
  const supabase = await createSupabaseServer();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const { data: perfil, error: perfilErr } = await supabase
    .from("usuarios")
    .select("rol, admin_nivel, estado, id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (perfilErr) {
    return {
      error: NextResponse.json({ error: perfilErr.message }, { status: 500 }),
    };
  }

  if (!perfil) {
    return {
      error: NextResponse.json(
        { error: "Tu perfil no está configurado" },
        { status: 403 }
      ),
    };
  }

  if (perfil.estado !== "ACTIVO") {
    return {
      error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }),
    };
  }

  if (perfil.rol !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }),
    };
  }

  return { perfil };
}

export async function GET(req: Request) {
  try {
    const { error } = await getPerfilAdmin();
    if (error) return error;

    const url = new URL(req.url);

    const estado = (url.searchParams.get("estado") || "").toUpperCase() as
      | EstadoFactura
      | "";
    const qRaw = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
    const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

    const admin = createSupabaseAdmin();

    const defaultEstados: EstadoFactura[] = [
      "PENDIENTE",
      "PARCIAL",
      "VENCIDA",
    ];

    let query = admin
      .from("facturas")
      .select(
        `
        id_factura,
        id_organizacion,
        periodo,
        total,
        saldo,
        estado_factura,
        fecha_vencimiento,
        created_at,
        organizaciones:organizaciones (
          nombre
        )
      `,
        { count: "exact" }
      )
      .eq("estado", "ACTIVO");

    if (estado) {
      query = query.eq("estado_factura", estado);
    } else {
      query = query.in("estado_factura", defaultEstados);
    }

    if (qRaw) {
      const q = qRaw.replaceAll("%", "");
      const asNum = Number(q);

      if (Number.isFinite(asNum) && asNum > 0) {
        query = query.or(`id_factura.eq.${asNum},periodo.ilike.%${q}%`);
      } else {
        query = query.ilike("periodo", `%${q}%`);
      }
    }

    query = query
      .order("fecha_vencimiento", { ascending: true, nullsFirst: false })
      .range(offset, offset + limit - 1);

    const { data, error: dbErr, count } = await query;

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    const facturas = (data ?? []).map((f: any) => ({
      id_factura: f.id_factura,
      id_organizacion: f.id_organizacion,
      organizacion_nombre: f.organizaciones?.nombre ?? "—",
      periodo: f.periodo,
      total: f.total,
      saldo: f.saldo,
      estado_factura: f.estado_factura,
      fecha_vencimiento: f.fecha_vencimiento,
    }));

    return NextResponse.json(
      {
        ok: true,
        count: count ?? 0,
        facturas,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
