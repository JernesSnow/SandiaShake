import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(request: Request) { 

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

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id_usuario")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado en BD" });
  }

  const { data: org } = await supabase
    .from("organizacion_usuario")
    .select("id_organizacion")
    .eq("id_usuario_cliente", usuario.id_usuario)
    .maybeSingle();

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" });
  }

  const url = new URL(request.url);
  const mesParam = url.searchParams.get("mes");
  const anioParam = url.searchParams.get("anio");
  const preview = url.searchParams.get("preview") === "true";

  let inicioMes: Date | null = null;
  let finMes: Date | null = null;

  if (mesParam !== "all") {
    const mes = mesParam ? Number(mesParam) : new Date().getMonth();
    const anio = anioParam ? Number(anioParam) : new Date().getFullYear();

    inicioMes = new Date(anio, mes, 1);
    finMes = new Date(anio, mes + 1, 1);
  }


const fechaContador = new Date();

const mesActual = fechaContador.getMonth();
const anioActual = fechaContador.getFullYear();

await supabase.from("reportes").insert({
  tipo: "CLIENTE",
  id_organizacion: org.id_organizacion,
  mes: mesActual,
  anio: anioActual
});

const { count } = await supabase
  .from("reportes")
  .select("*", { count: "exact", head: true })
  .eq("tipo", "CLIENTE")
  .eq("id_organizacion", org.id_organizacion)
  .eq("mes", mesActual)
  .eq("anio", anioActual);

const numeroReporte = count ?? 1;


  let query = supabase
    .from("tareas")
    .select("*")
    .eq("id_organizacion", org.id_organizacion)
    .order("created_at", { ascending: true });

  if (inicioMes && finMes) {
    query = query
      .gte("created_at", inicioMes.toISOString())
      .lt("created_at", finMes.toISOString());
  }

  const { data: tareas } = await query;

  if (!tareas || tareas.length === 0) {
    return NextResponse.json({
      message: "No hay tareas para este período",
    });
  }

  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id_usuario,nombre");

  const { data: orgs } = await supabase
    .from("organizaciones")
    .select("id_organizacion,nombre");

  const userMap = new Map((usuarios || []).map((u: any) => [u.id_usuario, u.nombre]));
  const orgMap = new Map((orgs || []).map((o: any) => [o.id_organizacion, o.nombre]));

  const estados = {
    pendiente: 0,
    en_progreso: 0,
    en_revision: 0,
    aprobada: 0,
  };

  tareas.forEach((t: any) => {
    if (estados[t.status_kanban as keyof typeof estados] !== undefined) {
      estados[t.status_kanban as keyof typeof estados]++;
    }
  });

 //pdf

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  let logoImage = null;

  try {
    const logoBytes = fs.readFileSync(
      path.join(process.cwd(), "public", "mock-logo-sandia-con-chole.png")
    );
    logoImage = await pdf.embedPng(logoBytes);
  } catch {}

  const fecha = new Date();
  const fechaTexto = fecha.toLocaleDateString();

  let page = pdf.addPage([595, 842]);

  if(logoImage){
    page.drawImage(logoImage,{x:440,y:700,width:120,height:100});
  }

 page.drawText("SandiaShake",{x:40,y:775,size:22,font,color:rgb(0.9,0.1,0.2)});
 page.drawText(`Reporte Administrativo #${numeroReporte}`,{x:40,y:744,size:16,font});
 page.drawText(`Fecha: ${fechaTexto}`,{x:40,y:715,size:12,font});

let textoMes = "Todos";

if (mesParam !== "all") {
 const mesNum = mesParam ? Number(mesParam) : fecha.getMonth();
 const anioNum = anioParam ? Number(anioParam) : fecha.getFullYear();

 const fechaTemp = new Date(anioNum, mesNum);
 textoMes = fechaTemp.toLocaleString("es-CR",{month:"long", year:"numeric"});
}

page.drawText(`Mes: ${textoMes}`,{
 x:40,
 y:700,
 size:12,
 font,
 color: rgb(0.1,0.1,0.1)
});


//cuadritos kpis

const kpis = Object.entries(estados);

const boxWidth = 120;
const boxHeight = 55;
const gap = 20;

const totalTableWidth = (boxWidth * 4) + (gap * 3);
let kx = (595 - totalTableWidth) / 2;

const getKpiColor = (key:string) => {
  switch(key){
    case "pendiente": return rgb(0.9,0.3,0.3);      
    case "en_progreso": return rgb(0.9,0.6,0.1);     
    case "en_revision": return rgb(0.3,0.5,0.9);     
    case "aprobada": return rgb(0.2,0.7,0.3);       
    default: return rgb(0.95,0.95,0.95);
  }
};

kpis.forEach(([key,val])=>{

  page.drawRectangle({
    x: kx,
    y: 600,
    width: boxWidth,
    height: boxHeight,
    color: getKpiColor(key),
    borderColor: rgb(0.1,0.1,0.1),
    borderWidth: 1
  });

  const titulo = key.replace("_"," ").toUpperCase();

  const textWidth = font.widthOfTextAtSize(titulo, 9);

  page.drawText(titulo,{
    x: kx + (boxWidth - textWidth)/2,
    y: 635,
    size: 9,
    font,
    color: rgb(0.1,0.1,0.1)
  });

  const valText = String(val);
  const valWidth = font.widthOfTextAtSize(valText, 18);

  page.drawText(valText,{
    x: kx + (boxWidth - valWidth)/2,
    y: 610,
    size: 18,
    font,
    color: rgb(0.1,0.1,0.1)
  });

  kx += boxWidth + gap; 
});

//Detalles tareas

//page = pdf.addPage([595, 842]);

let y = 545;
const startX = 50;

page.drawText("Detalle de tareas", {
  x: startX,
  y,
  size: 16,
  font
});

y -= 30;

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case "pendiente": return rgb(0.9,0.3,0.3);
    case "en_progreso": return rgb(0.9,0.6,0.1);
    case "en_revision": return rgb(0.3,0.5,0.9);
    case "aprobada": return rgb(0.2,0.7,0.3);
    default: return rgb(0.5,0.5,0.5);
  }
};

const formatEstado = (estado: string) => {
  switch (estado) {
    case "pendiente": return "PENDIENTE";
    case "en_progreso": return "EN PROGRESO";
    case "en_revision": return "EN REVISIÓN";
    case "aprobada": return "APROBADA";
    default: return estado;
  }
};

for (const t of tareas) {

  const col = userMap.get(t.id_colaborador) ?? "No asignado";

  const estadoTexto = formatEstado(t.status_kanban);

  const fechaCreacion = t.created_at
    ? new Date(t.created_at).toLocaleDateString("es-CR")
    : "No asignada";

  const fechaEntrega = t.fecha_entrega
    ? new Date(t.fecha_entrega).toLocaleDateString("es-CR")
    : "No asignada";

  const estadoColor = getEstadoColor(t.status_kanban);

  page.drawRectangle({
    x: startX,
    y: y - 5,
    width: 110,
    height: 18,
    color: estadoColor
  });

  page.drawText(estadoTexto, {
    x: startX + 5,
    y,
    size: 10,
    font,
    color: rgb(1,1,1)
  });

  const titulo = t.titulo.length > 65 
    ? t.titulo.slice(0,65) + "..."
    : t.titulo;

  page.drawText(titulo, {
    x: startX + 120,
    y,
    size: 12,
    font
  });

  y -= 15;
 
  page.drawText(
    `Colaborador: ${col}`,
    { x: startX + 120, y, size: 10, font, color: rgb(0.4,0.4,0.4) }
  );

  y -= 12;

  page.drawText(
    `Prioridad: ${t.prioridad}   |   Creación: ${fechaCreacion}   |   Entrega: ${fechaEntrega}`,
    { x: startX + 120, y, size: 10, font, color: rgb(0.4,0.4,0.4) }
  );

  page.drawLine({
    start: { x: 50, y: y - 8 },
    end: { x: 550, y: y - 8 },
    thickness: 0.5,
    color: rgb(0.85,0.85,0.85)
  });

  y -= 28;

  if (y < 80) {
    page = pdf.addPage([595, 842]);
    y = 780;

    page.drawText("Detalle de tareas", {
      x: startX,
      y,
      size: 16,
      font
    });

    y -= 30;
  }
}

  let nombrePeriodo = "general";
  let anioFinal = new Date().getFullYear();

  if (mesParam !== "all") {
    const mesNum = mesParam ? Number(mesParam) : new Date().getMonth();
    const anioNum = anioParam ? Number(anioParam) : new Date().getFullYear();

    const fechaTemp = new Date(anioNum, mesNum);

    nombrePeriodo = fechaTemp.toLocaleString("es-CR", {
      month: "long",
    });

    anioFinal = anioNum;
  }

  const filename = `reporte_tareas-#${numeroReporte}-${nombrePeriodo}-${anioFinal}-SandiaConChile.pdf`;

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": preview
        ? `inline; filename="Reporte-${filename}"`
        : `attachment; filename=${filename}`,
    },
  });
}