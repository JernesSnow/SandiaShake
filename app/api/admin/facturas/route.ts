import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { google } from "googleapis";
import oauth2Client, { ensureDriveCredentials } from "@/lib/google-drive/auth";

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
    const { id_organizacion, periodo, fecha_vencimiento, items } = body ?? {};

    if (!id_organizacion || !periodo) {
      return NextResponse.json(
        { error: "Campos requeridos: id_organizacion, periodo" },
        { status: 400 }
      );
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Debe incluir al menos un item" },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.tipo || typeof item.tipo !== "string" || !item.tipo.trim()) {
        return NextResponse.json(
          { error: "Cada item debe tener un tipo" },
          { status: 400 }
        );
      }
      if (!Number.isFinite(Number(item.cantidad)) || Number(item.cantidad) <= 0) {
        return NextResponse.json(
          { error: "Cada item debe tener cantidad > 0" },
          { status: 400 }
        );
      }
      if (!Number.isFinite(Number(item.precio_unitario)) || Number(item.precio_unitario) <= 0) {
        return NextResponse.json(
          { error: "Cada item debe tener precio_unitario > 0" },
          { status: 400 }
        );
      }
    }

    // Compute total from items
    const totalNum = items.reduce(
      (sum: number, item: any) => sum + Number(item.cantidad) * Number(item.precio_unitario),
      0
    );

    if (totalNum <= 0) {
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

    const facturaId = factura.id_factura;

    // Insert factura_detalles for each line item
    const detallesRows = items.map((item: any, idx: number) => ({
      id_factura: facturaId,
      concepto: String(item.tipo).trim(),
      tipo: "OTRO",
      cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario),
      total_linea: Number(item.cantidad) * Number(item.precio_unitario),
      orden: idx + 1,
      estado: "ACTIVO",
    }));

    const { error: detallesErr } = await admin
      .from("factura_detalles")
      .insert(detallesRows);

    if (detallesErr) {
      return NextResponse.json({ error: detallesErr.message }, { status: 500 });
    }

    // Create tareas for each line item (cantidad tareas per item)
    const tareasRows: Record<string, unknown>[] = [];
    for (const item of items) {
      const cantidad = Number(item.cantidad);
      const titulo = String(item.tipo).trim();
      for (let i = 0; i < cantidad; i++) {
        tareasRows.push({
          id_organizacion,
          id_colaborador: perfil!.id_usuario,
          id_factura: facturaId,
          titulo,
          status_kanban: "pendiente",
          tipo_entregable: "Otro",
          prioridad: "Media",
          estado: "ACTIVO",
          created_by: perfil!.id_usuario,
          updated_by: perfil!.id_usuario,
        });
      }
    }

    if (tareasRows.length > 0) {
  const { data: insertedTareas, error: tareasErr } = await admin
    .from("tareas")
    .insert(tareasRows)
    .select("id_tarea, titulo"); // VERY IMPORTANT

  if (tareasErr) {
    return NextResponse.json({ error: tareasErr.message }, { status: 500 });
  }

  // ============================================
  // DRIVE FOLDER CREATION
  // ============================================

  const ok = await ensureDriveCredentials();

  if (ok && insertedTareas?.length) {
    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    // 1️⃣ Get org root folder
    const { data: orgFolder } = await admin
      .from("google_drive_org_folders")
      .select("folder_id")
      .eq("id_organizacion", id_organizacion)
      .maybeSingle();

    if (orgFolder?.folder_id) {

      // 2️⃣ Create factura folder
      const facturaFolder = await drive.files.create({
        requestBody: {
          name: `Factura-${facturaId}`,
          mimeType: "application/vnd.google-apps.folder",
          parents: [orgFolder.folder_id],
        },
        fields: "id",
      });

      const facturaFolderId = facturaFolder.data.id!;

      // 3️⃣ Create subfolder per tarea
      for (const tarea of insertedTareas) {

        const safeTitle = tarea.titulo.replace(/[^\w\s-]/g, "").substring(0, 60);

        const taskFolder = await drive.files.create({
          requestBody: {
            name: `Tarea-${tarea.id_tarea}-${safeTitle}`,
            mimeType: "application/vnd.google-apps.folder",
            parents: [facturaFolderId],
          },
          fields: "id, webViewLink",
        });

        await admin.from("google_drive_task_folders").insert({
          id_tarea: tarea.id_tarea,
          id_factura: facturaId,
          id_organizacion,
          folder_id: taskFolder.data.id,
          folder_name: `Tarea-${tarea.id_tarea}`,
          folder_url: taskFolder.data.webViewLink ?? "",
        });
      }
    }
  }
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
