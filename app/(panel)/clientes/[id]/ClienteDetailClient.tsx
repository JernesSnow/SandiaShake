"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Folder, Plus, Trash2, Users,
  MapPin, Phone, Mail, FileText,
  CheckCircle, Clock, AlertTriangle, CheckSquare,
  TrendingUp, DollarSign, XCircle, ThumbsUp,
} from "react-feather";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

/* ================= TYPES ================= */

type Role = "ADMIN" | "COLABORADOR" | "CLIENTE";
type MetricColor = "green" | "red" | "yellow" | "blue" | "neutral" | "orange";

type Tarea = {
  id_tarea: number;
  titulo: string;
  status_kanban: string;
  tipo_tarea?: string | null;
};

type TaskFolder = {
  id_tarea: number;
  folder_name: string;
  folder_url: string;
};

type Nota = {
  id_nota: number;
  nota: string;
  created_at: string;
  autor?: { id_usuario?: number; nombre?: string; correo?: string } | null;
};

type Colaborador = {
  id_colaborador: number;
  nombre: string;
  correo: string;
};

/* ================= HELPERS ================= */

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

function formatCRC(n: number) {
  return "₡ " + n.toLocaleString("es-CR");
}

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-CR", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

const KANBAN_LABEL: Record<string, string> = {
  pendiente:   "Pendiente",
  en_progreso: "En progreso",
  en_revision: "En revisión",
  aprobada:    "Aprobada",
};

const KANBAN_STYLE: Record<string, string> = {
  pendiente:   "bg-[var(--ss-overlay)] text-[var(--ss-text2)] border border-[var(--ss-border)]",
  en_progreso: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-400/40",
  en_revision: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-400/40",
  aprobada:    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-400/40",
};

const FACTURA_STYLE: Record<string, string> = {
  PAGADA:    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-400/40",
  PENDIENTE: "bg-[var(--ss-overlay)] text-[var(--ss-text2)] border border-[var(--ss-border)]",
  PARCIAL:   "bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-400/40",
  VENCIDA:   "bg-red-500/15 text-[#ee2346] border border-red-400/40",
};

/* ================= SUB-COMPONENTS ================= */

function StatCard({ title, value, sub, accent }: {
  title: string; value: string | number; sub: string; accent?: "green" | "yellow" | "red";
}) {
  const valColor = accent === "green" ? "text-[#6cbe45]" : accent === "yellow" ? "text-yellow-500 dark:text-[#facc15]" : accent === "red" ? "text-[#ee2346]" : "text-[var(--ss-text)]";
  const strip    = accent === "green" ? "bg-[#6cbe45]"  : accent === "yellow" ? "bg-[#facc15]"  : accent === "red" ? "bg-[#ee2346]"  : "bg-[var(--ss-border)]";
  return (
    <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-5 flex flex-col gap-2 relative overflow-hidden hover:border-[var(--ss-text3)]/40 transition-colors">
      <div className={"absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl " + strip} />
      <p className="text-xs text-[var(--ss-text3)] pl-2">{title}</p>
      <p className={valColor + " text-2xl font-bold pl-2 leading-tight"}>{value}</p>
      <p className="text-xs text-[var(--ss-text3)] pl-2">{sub}</p>
    </div>
  );
}

function MetricCard({ icon, title, value, sub, color, progress }: {
  icon: React.ReactNode; title: string; value: string | number; sub: string;
  color: MetricColor; progress?: number;
}) {
  const accentColor: Record<MetricColor, string> = {
    green:   "bg-[#6cbe45]",
    red:     "bg-[#ee2346]",
    yellow:  "bg-[#facc15]",
    blue:    "bg-[#7dd3fc]",
    orange:  "bg-[#f97316]",
    neutral: "bg-[var(--ss-border)]",
  };
  const iconColor: Record<MetricColor, string> = {
    green:   "text-[#6cbe45]",
    red:     "text-[#ee2346]",
    yellow:  "text-yellow-500 dark:text-[#facc15]",
    blue:    "text-sky-500 dark:text-[#7dd3fc]",
    orange:  "text-orange-500 dark:text-[#f97316]",
    neutral: "text-[var(--ss-text3)]",
  };
  const valueColor: Record<MetricColor, string> = {
    green:   "text-[#6cbe45]",
    red:     "text-[#ee2346]",
    yellow:  "text-yellow-500 dark:text-[#facc15]",
    blue:    "text-sky-500 dark:text-[#7dd3fc]",
    orange:  "text-orange-500 dark:text-[#f97316]",
    neutral: "text-[var(--ss-text)]",
  };
  return (
    <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-5 flex flex-col gap-2 relative overflow-hidden hover:border-[var(--ss-text3)]/40 transition-colors">
      <div className={"absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl " + accentColor[color]} />
      <div className={"flex items-center gap-2 text-xs pl-2 " + iconColor[color]}>
        {icon}
        <span className="text-[var(--ss-text2)]">{title}</span>
      </div>
      <p className={valueColor[color] + " text-2xl font-bold pl-2"}>{value}</p>
      {progress !== undefined && (
        <div className="h-1.5 rounded-full bg-[var(--ss-overlay)] mx-2">
          <div className={"h-1.5 rounded-full transition-all " + accentColor[color]} style={{ width: Math.min(progress, 100) + "%" }} />
        </div>
      )}
      <p className="text-xs text-[var(--ss-text3)] leading-tight pl-2">{sub}</p>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-[var(--ss-border)]" />
      <span className="text-xs text-[var(--ss-text3)] uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-[var(--ss-border)]" />
    </div>
  );
}

/* ================= MAIN ================= */

export default function ClienteDetailClient({ id }: { id: string }) {
  const router = useRouter();

  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(null);
  const [role, setRole]                   = useState<Role | null>(null);
  const [facturas, setFacturas]           = useState<any[]>([]);
  const [cliente, setCliente]             = useState<any>(null);
  const [tareas, setTareas]               = useState<Tarea[]>([]);
  const [taskFolders, setTaskFolders]     = useState<TaskFolder[]>([]);
  const [notas, setNotas]                 = useState<Nota[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [todosColaboradores, setTodosColaboradores] = useState<any[]>([]);
  const [nuevoColaboradorId, setNuevoColaboradorId] = useState<number | null>(null);
  const [nuevaNota, setNuevaNota]         = useState("");
  const [loading, setLoading]             = useState(true);

  /* ── RESOLVE ROLE + ORG ── */
  useEffect(() => {
    if (!id || Array.isArray(id)) return;
    let alive = true;
    async function resolveOrg() {
      const rProfile = await fetch("/api/auth/profile");
      if (!rProfile.ok || !alive) return;
      const profile = await rProfile.json();
      const resolvedRole = (profile?.rol ?? "COLABORADOR") as Role;
      if (!alive) return;
      setRole(resolvedRole);
      if (resolvedRole !== "CLIENTE") {
        setResolvedOrgId(String(id));
      } else {
        const ownOrgId = profile?.organizacion?.id_organizacion;
        if (ownOrgId && alive) setResolvedOrgId(String(ownOrgId));
      }
    }
    resolveOrg();
    return () => { alive = false; };
  }, [id]);

  /* ── LOAD DATA ── */
  async function cargarTodo(orgId: string) {
    setLoading(true);
    try {
      const [rOrg, rF, rT, rTF, rN, rC] = await Promise.all([
        fetch(`/api/organizacion?id_organizacion=${orgId}`),
        fetch(`/api/admin/facturas/organizacion-id?id_organizacion=${orgId}`),
        fetch(`/api/admin/tareas?id_organizacion=${orgId}`),
        fetch(`/api/admin/google-drive-task-folders?id_organizacion=${orgId}`),
        fetch(`/api/admin/organizacion-notas?id_organizacion=${orgId}`),
        fetch(`/api/admin/asignaciones?id_organizacion=${orgId}`),
      ]);

      setCliente(rOrg.ok ? (await rOrg.json())?.organizacion ?? null : null);
      setFacturas((await rF.json())?.facturas ?? []);
      setTareas((await rT.json())?.data ?? []);
      setTaskFolders((await rTF.json())?.data ?? []);
      setNotas(rN.ok ? (await rN.json())?.data ?? [] : []);
      setColaboradores((await rC.json())?.data ?? []);

      if (role === "ADMIN") {
        const rU = await fetch("/api/admin/usuarios");
        if (rU.ok) {
          const jU = await rU.json();
          setTodosColaboradores((jU?.usuarios ?? []).filter((u: any) => u.rol === "COLABORADOR" && u.estado === "ACTIVO"));
        }
      }
    } catch (e) {
      console.error("Error cargando cliente:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!resolvedOrgId || !role) return;
    cargarTodo(resolvedOrgId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedOrgId, role]);

  /* ── DERIVED STATS ── */

  // Task stats
  const totalTareas      = tareas.length;
  const tareasPendientes = tareas.filter(t => t.status_kanban === "pendiente").length;
  const tareasEnProgreso = tareas.filter(t => t.status_kanban === "en_progreso").length;
  const tareasEnRevision = tareas.filter(t => t.status_kanban === "en_revision").length;
  const tareasAprobadas  = tareas.filter(t => t.status_kanban === "aprobada").length;

  // Responsiveness — how quickly does the client approve?
  // Measured against tasks that have reached review or approval stage
  const tareasEvaluadas   = tareasEnRevision + tareasAprobadas;
  const tasaAprobacion    = tareasEvaluadas > 0 ? Math.round((tareasAprobadas / tareasEvaluadas) * 100) : null;
  const pctAprobadas      = totalTareas > 0 ? Math.round((tareasAprobadas / totalTareas) * 100) : 0;

  const responsividad: MetricColor =
    tasaAprobacion === null ? "neutral"
    : tasaAprobacion >= 70 ? "green"
    : tasaAprobacion >= 40 ? "yellow"
    : "red";

  const responsividadLabel =
    tasaAprobacion === null ? "Sin datos aún"
    : tasaAprobacion >= 70 ? "Cliente muy responsivo"
    : tasaAprobacion >= 40 ? "Responsividad moderada"
    : "Baja responsividad";

  // Billing stats
  const totalFacturado   = facturas.reduce((s, f) => s + (f.total ?? 0), 0);
  const saldoPendiente   = facturas.reduce((s, f) => s + (f.saldo ?? 0), 0);
  const totalPagado      = totalFacturado - saldoPendiente;
  const facturasVencidas = facturas.filter(f => f.estado_factura === "VENCIDA").length;
  const facturasPagadas  = facturas.filter(f => f.estado_factura === "PAGADA").length;

  // Billing chart — group by periodo
  const facturasPorMes = useMemo(() => {
    const map: Record<string, { facturado: number; pagado: number }> = {};
    const sorted = [...facturas].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (const f of sorted) {
      const label = f.periodo ?? new Date(f.created_at).toLocaleDateString("es-CR", { month: "short", year: "2-digit" });
      if (!map[label]) map[label] = { facturado: 0, pagado: 0 };
      map[label].facturado += f.total  ?? 0;
      map[label].pagado    += (f.total ?? 0) - (f.saldo ?? 0);
    }
    return Object.entries(map).map(([mes, v]) => ({ mes, ...v }));
  }, [facturas]);

  const diasMora     = cliente?.estado_pago_organizacion?.[0]?.dias_mora    ?? 0;
  const estadoCuenta = cliente?.estado_pago_organizacion?.[0]?.estado_cuenta ?? null;

  /* ── ACTIONS ── */
  async function asignarColaborador() {
    if (!nuevoColaboradorId || !resolvedOrgId) return;
    await fetch("/api/admin/asignaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_organizacion: Number(resolvedOrgId), id_colaborador: nuevoColaboradorId }),
    });
    setNuevoColaboradorId(null);
    cargarTodo(resolvedOrgId);
  }

  async function removerColaborador(idColaborador: number) {
    if (!resolvedOrgId) return;
    await fetch(`/api/admin/asignaciones?id_organizacion=${resolvedOrgId}&id_colaborador=${idColaborador}`, { method: "DELETE" });
    cargarTodo(resolvedOrgId);
  }

  async function crearNota() {
    if (!nuevaNota.trim() || !resolvedOrgId) return;
    const r = await fetch("/api/admin/organizacion-notas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_organizacion: resolvedOrgId, nota: nuevaNota }),
    });
    const j = await r.json();
    if (r.ok) { setNotas(prev => [j.data, ...prev]); setNuevaNota(""); }
  }

  async function eliminarNota(idNota: number) {
    if (!resolvedOrgId || role !== "ADMIN") return;
    const r = await fetch(`/api/admin/organizacion-notas?id_nota=${idNota}`, { method: "DELETE" });
    if (r.ok) setNotas(prev => prev.filter(n => n.id_nota !== idNota));
  }

  /* ── LOADING / GUARD ── */
  if (loading || (role === "CLIENTE" && !resolvedOrgId)) {
    return <div className="text-[var(--ss-text3)] text-sm">Cargando organización…</div>;
  }
  if (!cliente) {
    return <div className="text-[var(--ss-text3)] text-sm">No se pudo cargar la organización.</div>;
  }

  const av = avatarColor(cliente.nombre ?? "O");

  return (
    <div className="flex flex-col gap-8 text-[var(--ss-text)]">

      {/* BACK */}
      <button
        onClick={() => router.push("/clientes")}
        className="flex items-center gap-2 text-sm text-[var(--ss-text2)] hover:text-[var(--ss-text)] transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        Volver a clientes
      </button>

      {/* PROFILE HEADER */}
      <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Avatar */}
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold select-none"
            style={{ backgroundColor: av.bg, color: av.text }}
          >
            {(cliente.nombre ?? "O").charAt(0).toUpperCase()}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-xl font-bold">{cliente.nombre}</h1>
              {estadoCuenta && estadoCuenta !== "AL_DIA" && (
                <span className={"text-xs font-semibold px-2.5 py-1 rounded-full border " + (diasMora > 30 ? "bg-red-500/15 text-[#ee2346] border-red-400/40" : "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-400/40")}>
                  {diasMora > 0 ? diasMora + "d mora" : estadoCuenta}
                </span>
              )}
            </div>
            {cliente.descripcion && (
              <p className="text-sm text-[var(--ss-text3)] leading-snug mb-3">{cliente.descripcion}</p>
            )}
            {/* Info chips */}
            <div className="flex flex-wrap gap-4">
              {(cliente.pais || cliente.ciudad) && (
                <span className="flex items-center gap-1.5 text-xs text-[var(--ss-text3)]">
                  <MapPin size={12} />
                  {[cliente.ciudad, cliente.canton, cliente.pais].filter(Boolean).join(", ")}
                </span>
              )}
              {cliente.telefono && (
                <span className="flex items-center gap-1.5 text-xs text-[var(--ss-text3)]">
                  <Phone size={12} />
                  {cliente.telefono}
                </span>
              )}
              {cliente.correo && (
                <span className="flex items-center gap-1.5 text-xs text-[var(--ss-text3)]">
                  <Mail size={12} />
                  {cliente.correo}
                </span>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-6 shrink-0 self-start">
            <div className="text-center">
              <p className="text-2xl font-bold">{totalTareas}</p>
              <p className="text-xs text-[var(--ss-text3)]">Tareas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{colaboradores.length}</p>
              <p className="text-xs text-[var(--ss-text3)]">Colaboradores</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{facturas.length}</p>
              <p className="text-xs text-[var(--ss-text3)]">Facturas</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tareas totales"  value={totalTareas}              sub="asignadas a este cliente" />
        <StatCard title="Aprobadas"       value={tareasAprobadas}          sub={"de " + totalTareas + " tareas"} accent="green" />
        <StatCard title="Por aprobar"     value={tareasEnRevision}         sub="esperando respuesta del cliente" accent={tareasEnRevision > 0 ? "yellow" : undefined} />
        <StatCard title="Total facturado" value={formatCRC(totalFacturado)} sub={facturas.length + " facturas emitidas"} accent={saldoPendiente > 0 ? "red" : "green"} />
      </div>

      {/* ── RESPONSIVIDAD ── */}
      <SectionDivider label="responsividad del cliente" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<ThumbsUp size={16} />}
          title="Tasa de aprobación"
          value={tasaAprobacion !== null ? tasaAprobacion + "%" : "—"}
          sub={responsividadLabel}
          color={responsividad}
          progress={tasaAprobacion ?? undefined}
        />
        <MetricCard
          icon={<CheckCircle size={16} />}
          title="Tareas aprobadas"
          value={tareasAprobadas}
          sub={"el " + pctAprobadas + "% del total"}
          color={pctAprobadas >= 60 ? "green" : pctAprobadas >= 30 ? "yellow" : "neutral"}
          progress={pctAprobadas}
        />
        <MetricCard
          icon={<Clock size={16} />}
          title="Pendientes de revisión"
          value={tareasEnRevision}
          sub="tareas esperando su aprobación"
          color={tareasEnRevision === 0 ? "green" : tareasEnRevision <= 3 ? "yellow" : "red"}
        />
        <MetricCard
          icon={<TrendingUp size={16} />}
          title="En producción"
          value={tareasEnProgreso}
          sub="tareas actualmente en trabajo"
          color="blue"
        />
      </div>

      {/* ── FACTURACIÓN ── */}
      <SectionDivider label="facturación" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<DollarSign size={16} />}
          title="Total facturado"
          value={formatCRC(totalFacturado)}
          sub={facturas.length + " facturas emitidas"}
          color="neutral"
        />
        <MetricCard
          icon={<AlertTriangle size={16} />}
          title="Saldo pendiente"
          value={formatCRC(saldoPendiente)}
          sub={formatCRC(totalPagado) + " pagado"}
          color={saldoPendiente > 0 ? "red" : "green"}
          progress={totalFacturado > 0 ? Math.round((totalPagado / totalFacturado) * 100) : 0}
        />
        <MetricCard
          icon={<CheckCircle size={16} />}
          title="Facturas pagadas"
          value={facturasPagadas}
          sub={"de " + facturas.length + " facturas"}
          color="green"
          progress={facturas.length > 0 ? Math.round((facturasPagadas / facturas.length) * 100) : 0}
        />
        <MetricCard
          icon={<XCircle size={16} />}
          title="Facturas vencidas"
          value={facturasVencidas}
          sub={diasMora > 0 ? diasMora + " días de mora" : "Sin mora"}
          color={facturasVencidas > 0 ? "red" : "green"}
        />
      </div>

      {/* Billing chart */}
      {facturasPorMes.length > 1 && (
        <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6">
          <h3 className="mb-4 font-semibold text-sm text-[var(--ss-text2)]">Facturación por período</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={facturasPorMes} barGap={4}>
              <XAxis dataKey="mes" tick={{ fill: "var(--ss-text3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--ss-text3)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false}
                tickFormatter={(v) => "₡" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--ss-raised)", border: "1px solid var(--ss-border)", borderRadius: 12, color: "var(--ss-text)", fontSize: 12 }}
                cursor={{ fill: "var(--ss-overlay)" }}
                formatter={(v: any) => ["₡ " + Number(v).toLocaleString("es-CR")]}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--ss-text2)" }} />
              <Bar dataKey="facturado" name="Facturado" fill="#7dd3fc" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pagado"    name="Pagado"    fill="#6cbe45" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Factura list */}
      {facturas.length > 0 && (
        <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6">
          <h3 className="mb-4 font-semibold text-sm text-[var(--ss-text2)] flex items-center gap-2">
            <FileText size={14} className="text-[#7dd3fc]" /> Historial de facturas
          </h3>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {[...facturas].sort((a, b) => b.id_factura - a.id_factura).map(f => (
              <div key={f.id_factura} className="flex justify-between items-center bg-[var(--ss-raised)] px-4 py-3 rounded-xl border border-[var(--ss-border)]">
                <div>
                  <p className="text-sm font-semibold">Factura #{f.id_factura}</p>
                  <p className="text-xs text-[var(--ss-text3)]">{f.periodo}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCRC(f.total ?? 0)}</p>
                    {f.saldo > 0 && <p className="text-xs text-[#ee2346]">Saldo: {formatCRC(f.saldo)}</p>}
                  </div>
                  <span className={"text-xs font-semibold px-2.5 py-1 rounded-full " + (FACTURA_STYLE[f.estado_factura] ?? "")}>
                    {f.estado_factura}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PRODUCCIÓN ── */}
      <SectionDivider label="producción" />

      {/* ── MAIN GRID ── */}
      <div className="grid lg:grid-cols-3 gap-8">

        {/* LEFT — task list + drive */}
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6">
            <h2 className="font-semibold mb-4 text-sm flex items-center gap-2">
              <CheckSquare size={14} className="text-[#6cbe45]" /> Tareas
            </h2>
            {tareas.length === 0 && <p className="text-xs text-[var(--ss-text3)]">No hay tareas registradas.</p>}
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {tareas.map(t => (
                <div key={t.id_tarea} className="bg-[var(--ss-raised)] px-4 py-3 rounded-xl border border-[var(--ss-border)] flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{t.titulo}</p>
                    {t.tipo_tarea && <p className="text-xs text-[var(--ss-text3)]">{t.tipo_tarea}</p>}
                  </div>
                  <span className={"shrink-0 text-xs px-2.5 py-1 rounded-full font-medium " + (KANBAN_STYLE[t.status_kanban] ?? "")}>
                    {KANBAN_LABEL[t.status_kanban] ?? t.status_kanban}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {taskFolders.length > 0 && (
            <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6">
              <h2 className="font-semibold mb-4 text-sm flex items-center gap-2">
                <Folder size={14} className="text-[#6cbe45]" /> Explorador de archivos
              </h2>
              <div className="rounded-xl border border-[var(--ss-border)] divide-y divide-[var(--ss-border)]">
                {taskFolders.map(folder => (
                  <a key={folder.id_tarea} href={folder.folder_url} target="_blank" rel="noreferrer"
                    className="flex justify-between px-4 py-3 hover:bg-[var(--ss-raised)] transition-colors first:rounded-t-xl last:rounded-b-xl">
                    <div className="flex items-center gap-3">
                      <Folder size={14} className="text-[#6cbe45]" />
                      <span className="text-sm">{folder.folder_name}</span>
                    </div>
                    <span className="text-xs text-[var(--ss-text3)]">Abrir →</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — colaboradores + notas */}
        <div className="space-y-8">
          {role !== "CLIENTE" && (
            <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2 text-sm">
                <Users size={14} /> Equipo asignado
              </h2>
              <div className="space-y-2 mb-4">
                {colaboradores.length === 0 && (
                  <p className="text-xs text-[var(--ss-text3)]">No hay colaboradores asignados.</p>
                )}
                {colaboradores.map(c => (
                  <div key={c.id_colaborador} className="bg-[var(--ss-raised)] p-3 rounded-xl border border-[var(--ss-border)] flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{c.nombre}</div>
                      <div className="text-xs text-[var(--ss-text3)]">{c.correo}</div>
                    </div>
                    {role === "ADMIN" && (
                      <button onClick={() => removerColaborador(c.id_colaborador)} className="text-[#ee2346] hover:text-red-400 transition" aria-label="Remover">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {role === "ADMIN" && (
                <div className="flex gap-2">
                  <select
                    value={nuevoColaboradorId ?? ""}
                    onChange={e => setNuevoColaboradorId(e.target.value ? Number(e.target.value) : null)}
                    className="bg-[var(--ss-input)] border border-[var(--ss-border)] rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:border-[#6cbe45]/50"
                  >
                    <option value="">Agregar colaborador…</option>
                    {todosColaboradores.map(c => (
                      <option key={c.id_usuario} value={c.id_usuario}>{c.nombre}</option>
                    ))}
                  </select>
                  <button onClick={asignarColaborador} className="bg-[#6cbe45] hover:bg-[#5aaa3c] transition px-3 rounded-xl" aria-label="Asignar">
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {role !== "CLIENTE" && (
            <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6">
              <h2 className="font-semibold mb-4 text-sm">Notas internas</h2>
              <div className="flex gap-2 mb-4">
                <textarea
                  value={nuevaNota}
                  onChange={e => setNuevaNota(e.target.value)}
                  className="flex-1 bg-[var(--ss-input)] border border-[var(--ss-border)] rounded-xl p-2 text-sm focus:outline-none focus:border-[#ee2346]/50 resize-none"
                  rows={2}
                  placeholder="Escribe una nota interna…"
                />
                <button onClick={crearNota} className="bg-[#ee2346] px-3 rounded-xl self-stretch hover:bg-[#cc1f3d] transition" aria-label="Crear nota">
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {notas.length === 0 && <p className="text-xs text-[var(--ss-text3)]">No hay notas internas.</p>}
                {notas.map(n => (
                  <div key={n.id_nota} className="bg-[var(--ss-raised)] p-3 rounded-xl border border-[var(--ss-border)]">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs text-[var(--ss-text3)]">
                        {n.autor?.nombre ?? "—"}{n.created_at ? " · " + formatDate(n.created_at) : ""}
                      </p>
                      {role === "ADMIN" && (
                        <button onClick={() => eliminarNota(n.id_nota)} className="text-[#ee2346] hover:text-red-400 transition shrink-0" aria-label="Eliminar">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{n.nota}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
