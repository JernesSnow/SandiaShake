"use client";

import { CheckCircle, Clock, AlertTriangle, FileText, ChevronRight } from "react-feather";

/* ─── helpers ─── */

function formatCRC(n: number) {
  return "₡ " + n.toLocaleString("es-CR");
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "long" }).format(d);
}

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

const KANBAN_DOT: Record<string, string> = {
  pendiente:   "bg-[var(--ss-border)]",
  en_progreso: "bg-sky-400",
  en_revision: "bg-amber-400",
  aprobada:    "bg-[#6cbe45]",
};

const KANBAN_LABEL: Record<string, string> = {
  pendiente:   "Pendiente",
  en_progreso: "En producción",
  en_revision: "En revisión",
  aprobada:    "Aprobada",
};

const FACTURA_COLOR: Record<string, string> = {
  PAGADA:    "text-[#6cbe45]",
  PENDIENTE: "text-[var(--ss-text2)]",
  PARCIAL:   "text-amber-500",
  VENCIDA:   "text-[#ee2346]",
};

/* ─── Progress ring ─── */
function ProgressRing({ pct, size = 96 }: { pct: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * (pct / 100);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ss-overlay)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#6cbe45" strokeWidth={8}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
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

  const { org, tareas: t, facturacion: f } = data;

  const total      = t?.total ?? 0;
  const aprobadas  = t?.aprobadas ?? 0;
  const revision   = t?.enRevision ?? 0;
  const progreso   = t?.enProgreso ?? 0;
  const pct        = total > 0 ? Math.round((aprobadas / total) * 100) : 0;

  const saldo      = f?.saldoTotal ?? 0;
  const vencidas   = f?.facturasVencidas ?? 0;
  const proxima    = f?.proximaFactura ?? null;
  const diasVence  = daysUntil(proxima?.fecha_vencimiento);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="flex flex-col gap-6 text-[var(--ss-text)]">

      {/* ── HERO ── */}
      <div
        className="rounded-2xl p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)" }}
      >
        {/* Decorative glow */}
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #6cbe45, transparent)" }} />
        <div className="absolute right-20 -bottom-8 w-36 h-36 rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #7dd3fc, transparent)" }} />

        <div className="relative z-10">
          <p className="text-white/50 text-sm mb-1">{greeting}</p>
          <h1 className="text-2xl font-bold text-white">{org?.nombre ?? "Tu organización"}</h1>
          {org?.descripcion && (
            <p className="text-white/40 text-sm mt-1 max-w-sm leading-snug">{org.descripcion}</p>
          )}
          {(org?.diasMora ?? 0) > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 bg-red-500/20 border border-red-400/30 text-red-300 text-xs font-semibold px-3 py-1.5 rounded-full">
              <AlertTriangle size={12} />
              {org.diasMora} días de mora en pagos
            </div>
          )}
        </div>

        {/* Progress ring */}
        <div className="relative z-10 flex flex-col items-center gap-1 shrink-0">
          <div className="relative">
            <ProgressRing pct={pct} size={100} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-white">{pct}%</span>
            </div>
          </div>
          <p className="text-white/40 text-xs">completado</p>
        </div>
      </div>

      {/* ── NEEDS YOUR ACTION (tasks in revision) ── */}
      {revision > 0 && (
        <div className="rounded-2xl border border-amber-400/30 bg-[var(--ss-surface)] overflow-hidden">
          <div className="px-5 py-4 bg-amber-400/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/20 text-amber-500">
                <Clock size={15} />
              </span>
              <div>
                <p className="font-semibold text-sm text-amber-600 dark:text-amber-300">
                  {revision === 1 ? "1 tarea espera tu revisión" : `${revision} tareas esperan tu revisión`}
                </p>
                <p className="text-xs text-[var(--ss-text3)]">Tu respuesta mantiene al equipo en movimiento</p>
              </div>
            </div>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white text-xs font-bold">
              {revision}
            </span>
          </div>
          <div className="divide-y divide-[var(--ss-border)]">
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
        </div>
      )}

      {/* ── TWO COLUMN ── */}
      <div className="grid lg:grid-cols-5 gap-6">

        {/* LEFT — task feed (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-[var(--ss-text2)]">Estado de tus entregas</h2>

          {/* Summary pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "En producción", count: progreso, color: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
              { label: "En revisión",   count: revision, color: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
              { label: "Aprobadas",     count: aprobadas, color: "bg-[#6cbe45]/15 text-[#6cbe45]" },
              { label: "Total",         count: total,    color: "bg-[var(--ss-overlay)] text-[var(--ss-text2)]" },
            ].map(p => (
              <span key={p.label} className={"text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 " + p.color}>
                {p.count} {p.label}
              </span>
            ))}
          </div>

          {/* Task list as feed */}
          <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] divide-y divide-[var(--ss-border)]">
            {(t?.recientes ?? []).length === 0 && (
              <p className="px-5 py-8 text-center text-xs text-[var(--ss-text3)]">No hay tareas aún.</p>
            )}
            {(t?.recientes ?? []).map((tarea: any) => (
              <div key={tarea.id_tarea} className="px-5 py-3.5 flex items-center gap-4">
                <span className={"shrink-0 h-2.5 w-2.5 rounded-full " + (KANBAN_DOT[tarea.status_kanban] ?? "bg-[var(--ss-border)]")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tarea.titulo}</p>
                  {tarea.fecha_entrega && (
                    <p className="text-xs text-[var(--ss-text3)] mt-0.5">Entrega: {formatDate(tarea.fecha_entrega)}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-[var(--ss-text3)]">
                  {KANBAN_LABEL[tarea.status_kanban] ?? tarea.status_kanban}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — billing (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-[var(--ss-text2)]">Tu cuenta</h2>

          {/* Balance card */}
          <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-5">
            <p className="text-xs text-[var(--ss-text3)] mb-1">Saldo pendiente</p>
            <p className={"text-3xl font-bold " + (saldo > 0 ? "text-[#ee2346]" : "text-[#6cbe45]")}>
              {formatCRC(saldo)}
            </p>
            {saldo === 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-[#6cbe45]">
                <CheckCircle size={12} /> Al día — sin pagos pendientes
              </div>
            )}
            {vencidas > 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-[#ee2346]">
                <AlertTriangle size={12} /> {vencidas} factura{vencidas > 1 ? "s" : ""} vencida{vencidas > 1 ? "s" : ""}
              </div>
            )}

            {/* Next due */}
            {proxima && (
              <div className={"mt-4 pt-4 border-t border-[var(--ss-border)]"}>
                <p className="text-xs text-[var(--ss-text3)] mb-2">Próximo vencimiento</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Factura #{proxima.id_factura}</p>
                    <p className="text-xs text-[var(--ss-text3)]">{proxima.periodo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCRC(proxima.saldo)}</p>
                    <p className={"text-xs font-semibold " + (diasVence !== null && diasVence <= 3 ? "text-[#ee2346]" : diasVence !== null && diasVence <= 7 ? "text-amber-500" : "text-[var(--ss-text3)]")}>
                      {diasVence === null ? "" : diasVence <= 0 ? "Vencida" : diasVence === 1 ? "Vence mañana" : "Vence en " + diasVence + "d"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Invoice history */}
          <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--ss-border)] flex items-center gap-2">
              <FileText size={13} className="text-[var(--ss-text3)]" />
              <p className="text-xs font-semibold text-[var(--ss-text2)]">Historial de facturas</p>
            </div>
            <div className="divide-y divide-[var(--ss-border)]">
              {(f?.historial ?? []).length === 0 && (
                <p className="px-5 py-6 text-xs text-center text-[var(--ss-text3)]">Sin facturas aún.</p>
              )}
              {(f?.historial ?? []).map((factura: any) => (
                <div key={factura.id_factura} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold">#{factura.id_factura} · {factura.periodo}</p>
                    {factura.fecha_vencimiento && (
                      <p className="text-[10px] text-[var(--ss-text3)]">{formatDate(factura.fecha_vencimiento)}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold">{formatCRC(factura.total ?? 0)}</p>
                    <p className={"text-[10px] font-semibold " + (FACTURA_COLOR[factura.estado_factura] ?? "")}>
                      {factura.estado_factura}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
