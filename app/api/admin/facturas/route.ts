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

export async function POST(req: Request) {
  try {
    const { perfil, error } = await getPerfilAdmin();
    if (error) return error;

    const body = await req.json();
    const { id_organizacion, periodo, total, fecha_vencimiento } = body ?? {};

    if (!id_organizacion || !periodo || total == null) {
      return NextResponse.json(
        { error: "Campos requeridos: id_organizacion, periodo, total" },
        { status: 400 }
      );
    }

    const totalNum = Number(total);
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      return NextResponse.json(
        { error: "El total debe ser un número positivo" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    // Verify the organization exists and is active
    const { data: org, error: orgErr } = await admin
      .from("organizaciones")
      .select("id_organizacion, estado")
      .eq("id_organizacion", id_organizacion)
      .maybeSingle();

    if (orgErr) {
      return NextResponse.json({ error: orgErr.message }, { status: 500 });
    }

    if (!org || org.estado !== "ACTIVO") {
      return NextResponse.json(
        { error: "Organización no encontrada o inactiva" },
        { status: 400 }
      );
    }

    const insertData: Record<string, unknown> = {
      id_organizacion,
      periodo: String(periodo).trim(),
      total: totalNum,
      saldo: totalNum,
      estado_factura: "PENDIENTE",
      estado: "ACTIVO",
      created_by: perfil!.id_usuario,
      updated_by: perfil!.id_usuario,
    };

    if (fecha_vencimiento) {
      insertData.fecha_vencimiento = fecha_vencimiento;
    }

    const { data: factura, error: insertErr } = await admin
      .from("facturas")
      .insert(insertData)
      .select("*")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, factura }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { perfil, error } = await getPerfilAdmin();
    if (error) return error;

    const body = await req.json();
    const { id_factura, periodo, total, fecha_vencimiento } = body ?? {};

    if (!id_factura) {
      return NextResponse.json(
        { error: "id_factura es requerido" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    // Fetch current factura
    const { data: current, error: fetchErr } = await admin
      .from("facturas")
      .select("total, saldo, estado")
      .eq("id_factura", id_factura)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!current || current.estado !== "ACTIVO") {
      return NextResponse.json(
        { error: "Factura no encontrada o eliminada" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_by: perfil!.id_usuario,
    };

    if (periodo !== undefined) {
      updates.periodo = String(periodo).trim();
    }

    if (fecha_vencimiento !== undefined) {
      updates.fecha_vencimiento = fecha_vencimiento || null;
    }

    if (total !== undefined) {
      const newTotal = Number(total);
      if (!Number.isFinite(newTotal) || newTotal <= 0) {
        return NextResponse.json(
          { error: "El total debe ser un número positivo" },
          { status: 400 }
        );
      }

      const paid = current.total - current.saldo;
      if (newTotal < paid) {
        return NextResponse.json(
          {
            error: `No se puede establecer el total por debajo de lo ya pagado (${paid.toLocaleString("es-CR")})`,
          },
          { status: 400 }
        );
      }

      updates.total = newTotal;
      updates.saldo = newTotal - paid;
    }

    const { data: factura, error: updateErr } = await admin
      .from("facturas")
      .update(updates)
      .eq("id_factura", id_factura)
      .select("*")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, factura }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { perfil, error } = await getPerfilAdmin();
    if (error) return error;

    const body = await req.json();
    const { id_factura } = body ?? {};

    if (!id_factura) {
      return NextResponse.json(
        { error: "id_factura es requerido" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    const { error: updateErr } = await admin
      .from("facturas")
      .update({
        estado: "ELIMINADO",
        updated_by: perfil!.id_usuario,
      })
      .eq("id_factura", id_factura)
      .eq("estado", "ACTIVO");

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}
