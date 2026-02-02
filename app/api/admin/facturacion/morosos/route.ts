import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

async function getPerfilAdmin() {
  const supabase = await createSupabaseServer();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  const { data: perfil, error: perfilErr } = await supabase
    .from("usuarios")
    .select("rol, admin_nivel, estado, id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (perfilErr) return { error: NextResponse.json({ error: perfilErr.message }, { status: 500 }) };
  if (!perfil) return { error: NextResponse.json({ error: "Tu perfil no está configurado" }, { status: 403 }) };
  if (perfil.estado !== "ACTIVO") return { error: NextResponse.json({ error: "Usuario inactivo" }, { status: 403 }) };
  if (perfil.rol !== "ADMIN") return { error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) };

  return { perfil };
}

type FacturaRow = {
  id_factura: number;
  id_organizacion: number;
  periodo: string | null;
  total: number | null;
  saldo: number | null;
  estado_factura: string | null;
  fecha_vencimiento: string | null; 
};

export async function GET(req: Request) {
  try {
    const { error } = await getPerfilAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
    const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

    const admin = createSupabaseAdmin();
    const hoy = new Date();
    const hoyISODate = hoy.toISOString().slice(0, 10); // YYYY-MM-DD

    // Facturas morosas
    // Regla: saldo > 0 y (estado_factura=VENCIDA o fecha_vencimiento < hoy)
    const { data: facturas, error: fErr } = await admin
      .from("facturas")
      .select("id_factura,id_organizacion,periodo,total,saldo,estado_factura,fecha_vencimiento")
      .eq("estado", "ACTIVO")
      .gt("saldo", 0)
      .or(`estado_factura.eq.VENCIDA,fecha_vencimiento.lt.${hoyISODate}`)
      .order("fecha_vencimiento", { ascending: true })
      .range(offset, offset + limit - 1);

    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });

    const rows = (facturas ?? []) as FacturaRow[];
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, items: [], total_morosos: 0 }, { status: 200 });
    }

    // Agrupar por organización
    const byOrg = new Map<number, {
      id_organizacion: number;
      facturas: FacturaRow[];
      monto_pendiente: number;
      fecha_limite_mas_antigua: string | null;
      dias_atraso: number; 
    }>();

    for (const f of rows) {
      const idOrg = Number(f.id_organizacion);
      if (!byOrg.has(idOrg)) {
        byOrg.set(idOrg, {
          id_organizacion: idOrg,
          facturas: [],
          monto_pendiente: 0,
          fecha_limite_mas_antigua: null,
          dias_atraso: 0,
        });
      }
      const g = byOrg.get(idOrg)!;
      g.facturas.push(f);
      g.monto_pendiente += Number(f.saldo ?? 0);

      const fv = f.fecha_vencimiento ? new Date(f.fecha_vencimiento) : null;
      if (fv) {
        const currentOld = g.fecha_limite_mas_antigua ? new Date(g.fecha_limite_mas_antigua) : null;
        if (!currentOld || fv < currentOld) g.fecha_limite_mas_antigua = f.fecha_vencimiento;

        // días atraso: hoy - fecha_vencimiento (si ya venció)
        const diffDays = Math.floor((hoy.getTime() - fv.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > g.dias_atraso) g.dias_atraso = diffDays;
      }
    }

    const orgIds = Array.from(byOrg.keys());

    // Traer info de organizaciones
    const { data: orgs, error: oErr } = await admin
      .from("organizaciones")
      .select("id_organizacion,nombre,estado")
      .in("id_organizacion", orgIds);

    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

    const orgMap = new Map<number, { nombre: string; estado: string }>();
    for (const o of orgs ?? []) {
      orgMap.set(Number((o as any).id_organizacion), {
        nombre: (o as any).nombre ?? "—",
        estado: (o as any).estado ?? "ACTIVO",
      });
    }

    const { data: links, error: lErr } = await admin
      .from("organizacion_usuario")
      .select("id_organizacion,id_usuario_cliente,estado")
      .in("id_organizacion", orgIds)
      .eq("estado", "ACTIVO");

    if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

    const userIds = Array.from(
      new Set((links ?? []).map((x: any) => x.id_usuario_cliente).filter(Boolean))
    );

    const { data: users, error: uErr } = userIds.length
      ? await admin
          .from("usuarios")
          .select("id_usuario,nombre,correo,rol,estado")
          .in("id_usuario", userIds)
      : { data: [], error: null };

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    const userMap = new Map<number, { nombre: string; correo: string | null }>();
    for (const u of users ?? []) {
      const uu = u as any;
      if (uu.estado === "ACTIVO" && uu.rol === "CLIENTE") {
        userMap.set(Number(uu.id_usuario), { nombre: uu.nombre ?? "Cliente", correo: uu.correo ?? null });
      }
    }

    const clientePorOrg = new Map<number, { nombre: string; correo: string | null }>();
    for (const link of links ?? []) {
      const lo = link as any;
      const idOrg = Number(lo.id_organizacion);
      const idUser = Number(lo.id_usuario_cliente);
      if (!clientePorOrg.has(idOrg) && userMap.has(idUser)) {
        clientePorOrg.set(idOrg, userMap.get(idUser)!);
      }
    }

    const items = orgIds.map((idOrg) => {
      const g = byOrg.get(idOrg)!;
      const org = orgMap.get(idOrg);
      const cliente = clientePorOrg.get(idOrg) ?? null;

      return {
        id_organizacion: idOrg,
        organizacion_nombre: org?.nombre ?? "—",
        organizacion_estado: org?.estado ?? "ACTIVO",
        dias_atraso: g.dias_atraso,
        monto_pendiente: Number(g.monto_pendiente.toFixed(2)),
        fecha_limite_vencida: g.fecha_limite_mas_antigua,
        facturas_count: g.facturas.length,
        cliente_contacto: cliente, 
        facturas: g.facturas, 
      };
    });

    items.sort((a, b) => (b.dias_atraso - a.dias_atraso) || (b.monto_pendiente - a.monto_pendiente));

    return NextResponse.json(
      { ok: true, total_morosos: items.length, items },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error interno" }, { status: 500 });
  }
}
