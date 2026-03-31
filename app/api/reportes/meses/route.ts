import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {

  const cookieStore = await cookies();

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) return NextResponse.json([]);

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("id_usuario, rol")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!perfil) return NextResponse.json([]);

  let tareasQuery = supabase
    .from("tareas")
    .select("created_at");

  if (perfil.rol === "CLIENTE") {
    const { data: org } = await supabase
      .from("organizacion_usuario")
      .select("id_organizacion")
      .eq("id_usuario_cliente", perfil.id_usuario)
      .maybeSingle();

    if (!org) return NextResponse.json([]);

    tareasQuery = tareasQuery.eq("id_organizacion", org.id_organizacion);
  }

  const { data } = await tareasQuery;

  if (!data) return NextResponse.json([]);

  const mesesMap = new Map();

  data.forEach((t: any) => {
    const fecha = new Date(t.created_at);
    const mes = fecha.getMonth();
    const anio = fecha.getFullYear();

    const key = `${mes}-${anio}`;

    if (!mesesMap.has(key)) {
      mesesMap.set(key, {
        mes,
        anio,
        label: fecha.toLocaleString("es-CR", {
          month: "long",
          year: "numeric",
        }),
      });
    }
  });

  const meses = Array.from(mesesMap.values()).sort(
    (a: any, b: any) => b.anio - a.anio || b.mes - a.mes
  );

  return NextResponse.json([
    { label: "Todos", mes: "all", anio: null },
    ...meses,
  ]);
}