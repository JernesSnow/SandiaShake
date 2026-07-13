"use client";

import { CheckCircle, Clock, AlertTriangle, Circle, TrendingUp, ThumbsUp, ThumbsDown, MessageCircle, Calendar, MapPin, Phone, Mail } from "react-feather";
import KPI from "./KPI";

/* ─── helpers ─── */

function formatDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "long" }).format(d);
}

const AVATAR_COLORS = [
  { bg: "#ee2346", text: "#fff" },
  { bg: "#6cbe45", text: "#fff" },
  { bg: "#3b82f6", text: "#fff" },
  { bg: "#8b5cf6", text: "#fff" },
  { bg: "#f97316", text: "#fff" },
  { bg: "#14b8a6", text: "#fff" },
];

function avatarColor(nombre: string) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ─── main ─── */

export default function ClienteDashboard({ data }: { data: any }) {
  if (!data) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--ss-text3)] text-sm">
        Cargando tu resumen…
      </div>
    );
  }

  if (data.noOrg) {
    return (
      <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-12 text-center">
        <p className="text-lg font-semibold text-[var(--ss-text)] mb-2">Bienvenido 👋</p>
        <p className="text-sm text-[var(--ss-text3)]">Tu administrador aún no ha configurado tu organización.</p>
      </div>
    );
  }

  const { org, tareas: t, aprobaciones: ap } = data;

  const aprobadas  = t?.aprobadas ?? 0;
  const revision   = t?.enRevision ?? 0;
  const progreso   = t?.enProgreso ?? 0;
  const pendientes = t?.pendientes ?? 0;
  const proximaEntrega = t?.proximaEntrega ?? null;

  const tareasAprobadas  = ap?.aprobadas ?? 0;
  const tareasRechazadas = ap?.rechazadas ?? 0;
  const totalRevisiones  = tareasAprobadas + tareasRechazadas;
  const pctAprobacion    = totalRevisiones > 0 ? Math.round((tareasAprobadas / totalRevisiones) * 100) : null;

  const mensajesSinLeer      = t?.mensajesSinLeer ?? [];
  const totalMensajesSinLeer = mensajesSinLeer.reduce((s: number, x: any) => s + (x.unread_count ?? 0), 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="flex flex-col gap-6 text-[var(--ss-text)]">

      {/* ── HERO + PRÓXIMA ENTREGA ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">

        {/* HERO */}
        <div className="flex-1 rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] px-7 py-8">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold select-none"
              style={{ backgroundColor: avatarColor(org?.nombre ?? "O").bg, color: avatarColor(org?.nombre ?? "O").text }}
            >
              {(org?.nombre ?? "O").charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[var(--ss-text3)] text-sm mb-1">{greeting}</p>
              <h1 className="text-2xl font-bold text-[var(--ss-text)]">{org?.nombre ?? "Tu organización"}</h1>
              {org?.descripcion && (
                <p className="text-[var(--ss-text3)] text-sm mt-1 max-w-md leading-snug">{org.descripcion}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-3">
                {(org?.ciudad || org?.pais) && (
                  <span className="flex items-center gap-1.5 text-xs text-[var(--ss-text3)]">
                    <MapPin size={12} />
                    {[org.ciudad, org.pais].filter(Boolean).join(", ")}
                  </span>
                )}
                {org?.telefono && (
                  <span className="flex items-center gap-1.5 text-xs text-[var(--ss-text3)]">
                    <Phone size={12} />
                    {org.telefono}
                  </span>
                )}
                {org?.correo && (
                  <span className="flex items-center gap-1.5 text-xs text-[var(--ss-text3)]">
                    <Mail size={12} />
                    {org.correo}
                  </span>
                )}
              </div>

              {(org?.diasMora ?? 0) > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 bg-[#ee2346]/10 border border-[#ee2346]/30 text-[#ee2346] text-xs font-semibold px-3 py-1.5 rounded-full">
                  <AlertTriangle size={12} />
                  {org.diasMora} días de mora en pagos
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Próxima entrega — separada de la tarjeta de la organización */}
        <div className="lg:w-72 shrink-0">
          <KPI
            icon={<Calendar size={24} />}
            label="Próxima entrega"
            value={proximaEntrega ? formatDate(proximaEntrega.fecha_entrega)! : "—"}
            accent="#7dd3fc"
            size="lg"
            fullHeight
            description={proximaEntrega ? proximaEntrega.titulo : "No tienes entregas próximas por ahora."}
          />
        </div>
      </div>

      {/* ── NEEDS YOUR ACTION (tasks in revision) + UNREAD MESSAGES ── */}
      <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-amber-400/30 bg-[var(--ss-surface)] overflow-hidden">
            <div className="px-5 py-4 bg-amber-400/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/20 text-amber-500">
                  {revision > 0 ? <Clock size={15} /> : <CheckCircle size={15} />}
                </span>
                <div>
                  <p className="font-semibold text-sm text-amber-600 dark:text-amber-300">
                    {revision === 0
                      ? "Sin revisiones pendientes"
                      : revision === 1
                      ? "1 tarea espera tu revisión"
                      : `${revision} tareas esperan tu revisión`}
                  </p>
                  <p className="text-xs text-[var(--ss-text3)]">
                    {revision > 0 ? "Tu respuesta mantiene al equipo en movimiento" : "No tienes tareas esperando tu aprobación"}
                  </p>
                </div>
              </div>
              {revision > 0 && (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white text-xs font-bold">
                  {revision}
                </span>
              )}
            </div>
            {(t?.paraTuAprobacion ?? []).length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-[var(--ss-text3)]">Estás al día — no hay tareas esperando tu revisión.</p>
            ) : (
              <div className="divide-y divide-[var(--ss-border)] max-h-[280px] overflow-y-auto">
                {(t?.paraTuAprobacion ?? []).map((tarea: any) => (
                  <div key={tarea.id_tarea} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tarea.titulo}</p>
                      {tarea.tipo && <p className="text-xs text-[var(--ss-text3)]">{tarea.tipo}</p>}
                    </div>
                    {tarea.fecha_entrega && (
                      <span className="shrink-0 text-xs text-[var(--ss-text3)]">{formatDate(tarea.fecha_entrega)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={"rounded-2xl border bg-[var(--ss-surface)] overflow-hidden " + (totalMensajesSinLeer > 0 ? "border-sky-400/30" : "border-[var(--ss-border)]")}>
            <div className={"px-5 py-4 flex items-center justify-between " + (totalMensajesSinLeer > 0 ? "bg-sky-400/10" : "")}>
              <div className="flex items-center gap-3">
                <span className={"flex h-8 w-8 items-center justify-center rounded-full " + (totalMensajesSinLeer > 0 ? "bg-sky-400/20 text-sky-500" : "bg-[#6cbe45]/15 text-[#6cbe45]")}>
                  {totalMensajesSinLeer > 0 ? <MessageCircle size={15} /> : <CheckCircle size={15} />}
                </span>
                <div>
                  <p className={"font-semibold text-sm " + (totalMensajesSinLeer > 0 ? "text-sky-600 dark:text-sky-300" : "text-[var(--ss-text)]")}>
                    {totalMensajesSinLeer === 0
                      ? "Sin mensajes sin leer"
                      : totalMensajesSinLeer === 1
                      ? "1 mensaje sin leer"
                      : `${totalMensajesSinLeer} mensajes sin leer`}
                  </p>
                  <p className="text-xs text-[var(--ss-text3)]">Actualizaciones del equipo en tus tareas</p>
                </div>
              </div>
              {totalMensajesSinLeer > 0 && (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white text-xs font-bold">
                  {totalMensajesSinLeer}
                </span>
              )}
            </div>
            {mensajesSinLeer.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-[var(--ss-text3)]">Estás al día — no tienes mensajes sin leer.</p>
            ) : (
              <div className="divide-y divide-[var(--ss-border)] max-h-[280px] overflow-y-auto">
                {mensajesSinLeer.map((tarea: any) => (
                  <div key={tarea.id_tarea} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tarea.titulo}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {tarea.tipo && <p className="text-xs text-[var(--ss-text3)]">{tarea.tipo}</p>}
                        {tarea.tipo && tarea.fecha_entrega && <span className="text-[var(--ss-text3)]">·</span>}
                        {tarea.fecha_entrega && (
                          <p className="text-xs text-[var(--ss-text3)]">{formatDate(tarea.fecha_entrega)}</p>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 flex h-6 min-w-[24px] px-1.5 items-center justify-center rounded-full bg-sky-500 text-white text-xs font-bold">
                      {tarea.unread_count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>

      {/* ── TWO COLUMN ── */}
      <div className="grid lg:grid-cols-5 gap-6">

        {/* LEFT — task feed (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-[var(--ss-text2)]">Estado de tus entregables</h2>

          {/* KPIs por estado */}
          <div className="grid grid-cols-2 gap-4">
            <KPI
              icon={<Circle size={24} />}
              label="Pendiente"
              value={pendientes}
              accent="#94a3b8"
              size="lg"
              description="Aún no se ha comenzado a trabajar en ellas."
            />
            <KPI
              icon={<TrendingUp size={24} />}
              label="En producción"
              value={progreso}
              accent="#0ea5e9"
              size="lg"
              description="El equipo está trabajando en ellas."
            />
            <KPI
              icon={<Clock size={24} />}
              label="En revisión"
              value={revision}
              accent="#f59e0b"
              size="lg"
              description="Esperan tu aprobación."
            />
            <KPI
              icon={<CheckCircle size={24} />}
              label="Aprobadas"
              value={aprobadas}
              accent="#6cbe45"
              size="lg"
              description="Ya fueron aprobadas por ti."
            />
          </div>
        </div>

        {/* RIGHT — billing (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-[var(--ss-text2)]">Tus revisiones</h2>

          {/* Tareas: aprobación vs rechazo */}
          <div className="grid grid-cols-2 gap-4">
            <KPI
              icon={<ThumbsUp size={24} />}
              label="Aprobadas"
              value={tareasAprobadas}
              accent="#6cbe45"
              size="lg"
              description="Tareas que aceptaste."
            />
            <KPI
              icon={<ThumbsDown size={24} />}
              label="Rechazadas"
              value={tareasRechazadas}
              accent="#ee2346"
              size="lg"
              description="Tareas que pediste corregir."
            />
          </div>

          {/* Tasa de aprobación + feedback */}
          <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-5 h-[150px] overflow-hidden flex flex-col">
            <p className="text-xs text-[var(--ss-text3)] mb-2 shrink-0">Tasa de aprobación</p>
            {totalRevisiones === 0 ? (
              <p className="text-sm text-[var(--ss-text3)]">Aún no tienes revisiones registradas.</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1.5 shrink-0">
                  <span className="text-2xl font-bold text-[var(--ss-text)]">{pctAprobacion}%</span>
                  <span className="text-xs text-[var(--ss-text3)]">{tareasAprobadas} de {totalRevisiones} revisadas</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--ss-overlay)] overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full bg-[#6cbe45] transition-all"
                    style={{ width: pctAprobacion + "%" }}
                  />
                </div>
                <p className="text-xs text-[var(--ss-text3)] mt-3 leading-snug line-clamp-2">
                  {pctAprobacion! >= 80
                    ? "Excelente — la mayoría de tus revisiones se aprueban sin correcciones."
                    : pctAprobacion! >= 50
                    ? "Buen ritmo. Comentarios claros al rechazar ayudan a agilizar las correcciones."
                    : "Da el mayor detalle posible en tus comentarios de rechazo para acelerar las correcciones."}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
