"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Gift, CheckCircle, Clock, TrendingUp,
  AlertTriangle, CheckSquare, RefreshCw, Archive, ArrowLeft, Edit2,
} from "react-feather";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const AVATAR_COLORS = [
  { bg: "#ee2346", text: "#fff" },
  { bg: "#6cbe45", text: "#fff" },
  { bg: "#3b82f6", text: "#fff" },
  { bg: "#8b5cf6", text: "#fff" },
  { bg: "#f97316", text: "#fff" },
  { bg: "#14b8a6", text: "#fff" },
  { bg: "#ec4899", text: "#fff" },
  { bg: "#6366f1", text: "#fff" },
  { bg: "#eab308", text: "#fff" },
  { bg: "#0ea5e9", text: "#fff" },
];

function avatarColor(nombre: string) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type Premio = {
  id_premio: number;
  nombre: string;
  descripcion: string;
  puntos_costo: number;
};

type Redencion = {
  id_canje: number;
  premio_nombre: string;
  puntos_usados: number;
  fecha_canje: string;
  estado: "ACTIVO" | "INACTIVO";
};

type Ajuste = {
  id_movimiento: number;
  puntos: number;
  motivo: string;
  fecha: string;
  admin_nombre: string;
};

type Colaborador = {
  id: string;
  nombre: string;
  email: string;
  totalTareas: number;
  tareasPendientes: number;
  tareasAprobadas: number;
  chilliPoints: number;
};

type Metricas = {
  totalTareas: number;
  tareasAprobadas: number;
  tareasRechazadas: number;
  tareasEnProgreso: number;
  tareasEnRevision: number;
  tareasPendientes: number;
  puntualidad: number | null;
  tareasATiempo: number;
  tareasConRetraso: number;
  tareasConFechaEntrega: number;
  tiempoPromedioEntrega: number | null;
  aprobadasPrimeraVersion: number;
  tasaAprobacionPrimeraVersion: number | null;
  versionesPromedio: number | null;
  porMes: { mes: string; aprobadas: number; rechazadas: number; versiones: number }[];
};

type MetricCardColor = "green" | "red" | "yellow" | "blue" | "neutral";

export default function ColaboradorDetail() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);

  const [perfil, setPerfil] = useState<Colaborador | null>(null);
  const [premios, setPremios] = useState<Premio[]>([]);
  const [redenciones, setRedenciones] = useState<Redencion[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [canjeando, setCanjeando] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAjuste, setShowAjuste] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({ tipo: "sumar" as "sumar" | "restar", puntos: "", motivo: "" });
  const [ajusteError, setAjusteError] = useState("");
  const [ajustando, setAjustando] = useState(false);

  async function safeJson(res: Response) {
    try {
      const t = await res.text();
      return t ? JSON.parse(t) : {};
    } catch {
      return {};
    }
  }

  async function cargarTodo() {
    if (!id) return;
    try {
      setLoading(true);
      const [colabRes, premiosRes, redencionesRes, metricasRes, ajustesRes] = await Promise.all([
        fetch("/api/admin/colaboradores", { cache: "no-store" }),
        fetch("/api/admin/premios", { cache: "no-store" }),
        fetch("/api/rewards/redemptions?id_colaborador=" + id, { cache: "no-store" }),
        fetch("/api/admin/colaboradores/metricas?id_colaborador=" + id, { cache: "no-store" }),
        fetch("/api/admin/chilli-points?id_usuario=" + id, { cache: "no-store" }),
      ]);

      if (colabRes.ok) {
        const json = await safeJson(colabRes);
        const u = (json.colaboradores ?? []).find(
          (u: any) => String(u.id_usuario) === String(id)
        );
        if (u) {
          setPerfil({
            id: String(u.id_usuario),
            nombre: u.nombre,
            email: u.correo,
            totalTareas: u.totalTareas ?? 0,
            tareasPendientes: u.tareasPendientes ?? 0,
            tareasAprobadas: u.tareasAprobadas ?? 0,
            chilliPoints: u.chilliPoints ?? 0,
          });
        } else {
          setPerfil(null);
        }
      }

      if (premiosRes.ok) {
        const j = await safeJson(premiosRes);
        setPremios((j.premios ?? []).filter((p: any) => p.visible !== false));
      }

      if (redencionesRes.ok) {
        const j = await safeJson(redencionesRes);
        setRedenciones(j.redenciones ?? []);
      }

      if (metricasRes.ok) {
        const j = await safeJson(metricasRes);
        setMetricas(j.metricas ?? null);
      }

      if (ajustesRes.ok) {
        const j = await safeJson(ajustesRes);
        setAjustes(j.ajustes ?? []);
      }
    } catch {
      setPerfil(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) cargarTodo();
  }, [id]);

  async function canjearPremio(idPremio: number) {
    if (!id) return;
    try {
      setCanjeando(idPremio);
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_colaborador: Number(id), id_premio: idPremio }),
      });
      if (!res.ok) {
        const j = await safeJson(res);
        alert(j?.error ?? "No se pudo canjear");
        return;
      }
      alert("Premio canjeado");
      await cargarTodo();
    } catch {
      alert("Error al canjear");
    } finally {
      setCanjeando(null);
    }
  }

  function abrirAjuste() {
    setAjusteForm({ tipo: "sumar", puntos: "", motivo: "" });
    setAjusteError("");
    setShowAjuste(true);
  }

  function cerrarAjuste() {
    setShowAjuste(false);
    setAjusteError("");
  }

  async function guardarAjuste() {
    setAjusteError("");

    const cantidad = Number(ajusteForm.puntos);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setAjusteError("Ingresa una cantidad de puntos válida (entero mayor a 0).");
      return;
    }

    if (!ajusteForm.motivo.trim()) {
      setAjusteError("Ingresa un motivo para el ajuste.");
      return;
    }

    try {
      setAjustando(true);
      const puntos = ajusteForm.tipo === "restar" ? -cantidad : cantidad;
      const res = await fetch("/api/admin/chilli-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: Number(id), puntos, motivo: ajusteForm.motivo.trim() }),
      });
      const j = await safeJson(res);
      if (!res.ok) {
        setAjusteError(j?.error ?? "No se pudo aplicar el ajuste");
        return;
      }
      await cargarTodo();
      cerrarAjuste();
    } catch {
      setAjusteError("Error al aplicar el ajuste");
    } finally {
      setAjustando(false);
    }
  }

  async function marcarUsado(id_canje: number) {
    const res = await fetch("/api/rewards/use", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_canje }),
    });
    if (!res.ok) {
      alert("No se pudo marcar como usado");
      return;
    }
    await cargarTodo();
  }

  if (loading) {
    return <div className="text-[var(--ss-text3)]">Cargando colaborador…</div>;
  }

  if (!perfil) {
    return <div className="text-[var(--ss-text3)]">No se pudo cargar el colaborador</div>;
  }

  return (
    <div className="flex flex-col gap-8">

      {/* BACK */}
      <button
        onClick={() => router.push("/colaboradores")}
        className="flex items-center gap-2 text-sm text-[var(--ss-text2)] hover:text-[var(--ss-text)] transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        Volver al equipo
      </button>

      {/* PROFILE */}
      <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold select-none"
            style={{ backgroundColor: avatarColor(perfil.nombre).bg, color: avatarColor(perfil.nombre).text }}
          >
            {perfil.nombre?.charAt(0).toUpperCase() ?? "C"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--ss-text)]">{perfil.nombre}</h1>
            <p className="text-sm text-[var(--ss-text3)] mt-0.5">{perfil.email}</p>
          </div>
        </div>
      </div>

      {/* MÉTRICAS */}
      {metricas && (
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-bold text-[var(--ss-text)]">Métricas de Desempeño</h2>

          {/* ROW 0 — overview */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Tareas totales" value={metricas.totalTareas} sub="asignadas" />
            <StatCard title="Pendientes" value={metricas.tareasPendientes} sub="sin completar" accent="yellow" />
            <StatCard title="Aprobadas" value={metricas.tareasAprobadas} sub={"de " + metricas.totalTareas + " tareas"} accent="green" />
            <ChilliCard points={perfil.chilliPoints} onAdjust={abrirAjuste} />
          </div>

          {/* DIVIDER */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--ss-border)]" />
            <span className="text-xs text-[var(--ss-text3)] uppercase tracking-widest">rendimiento</span>
            <div className="h-px flex-1 bg-[var(--ss-border)]" />
          </div>

          {/* ROW 1 — delivery */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<AlertTriangle size={16} />}
              title="Tareas rechazadas"
              value={metricas.tareasRechazadas}
              sub="rechazo final del cliente"
              color={metricas.tareasRechazadas === 0 ? "green" : "red"}
            />
            <MetricCard
              icon={<CheckCircle size={16} />}
              title="Puntualidad"
              value={metricas.puntualidad !== null ? metricas.puntualidad + "%" : "—"}
              sub={
                metricas.tareasConFechaEntrega > 0
                  ? metricas.tareasATiempo + " a tiempo / " + metricas.tareasConRetraso + " con retraso"
                  : "Sin tareas con fecha"
              }
              color={
                metricas.puntualidad === null ? "neutral"
                : metricas.puntualidad >= 80 ? "green"
                : metricas.puntualidad >= 50 ? "yellow"
                : "red"
              }
              progress={metricas.puntualidad ?? undefined}
            />
            <MetricCard
              icon={<Clock size={16} />}
              title="Tiempo prom. entrega"
              value={metricas.tiempoPromedioEntrega !== null ? metricas.tiempoPromedioEntrega + "d" : "—"}
              sub="días desde asignación al primer envío"
              color="blue"
            />
            <MetricCard
              icon={<CheckSquare size={16} />}
              title="En revisión"
              value={metricas.tareasEnRevision}
              sub="esperando respuesta del cliente"
              color="neutral"
            />
          </div>

          {/* ROW 2 — quality */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<TrendingUp size={16} />}
              title="Aprobación 1ra versión"
              value={metricas.tasaAprobacionPrimeraVersion !== null ? metricas.tasaAprobacionPrimeraVersion + "%" : "—"}
              sub={metricas.aprobadasPrimeraVersion + " de " + metricas.tareasAprobadas + " tareas aprobadas"}
              color={
                metricas.tasaAprobacionPrimeraVersion === null ? "neutral"
                : metricas.tasaAprobacionPrimeraVersion >= 70 ? "green"
                : metricas.tasaAprobacionPrimeraVersion >= 40 ? "yellow"
                : "red"
              }
              progress={metricas.tasaAprobacionPrimeraVersion ?? undefined}
            />
            <MetricCard
              icon={<RefreshCw size={16} />}
              title="Versiones promedio"
              value={metricas.versionesPromedio !== null ? metricas.versionesPromedio + "v" : "—"}
              sub="rondas de revisión por tarea"
              color={
                metricas.versionesPromedio === null ? "neutral"
                : metricas.versionesPromedio <= 1.5 ? "green"
                : metricas.versionesPromedio <= 2.5 ? "yellow"
                : "red"
              }
            />
            <MetricCard
              icon={<CheckSquare size={16} />}
              title="En progreso"
              value={metricas.tareasEnProgreso}
              sub="tareas actualmente activas"
              color="yellow"
            />
            <MetricCard
              icon={<Archive size={16} />}
              title="Archivadas"
              value={
                metricas.totalTareas
                - metricas.tareasAprobadas
                - metricas.tareasRechazadas
                - metricas.tareasEnProgreso
                - metricas.tareasEnRevision
                - metricas.tareasPendientes
              }
              sub="tareas archivadas"
              color="neutral"
            />
          </div>

          {/* CHART */}
          {metricas.porMes.some((m) => m.aprobadas > 0 || m.rechazadas > 0 || m.versiones > 0) && (
            <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6">
              <h3 className="mb-4 font-semibold text-sm text-[var(--ss-text2)]">
                Actividad últimos 6 meses
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={metricas.porMes} barGap={4}>
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: "var(--ss-text3)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--ss-text3)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--ss-raised)",
                      border: "1px solid var(--ss-border)",
                      borderRadius: 12,
                      color: "var(--ss-text)",
                      fontSize: 12,
                    }}
                    cursor={{ fill: "var(--ss-overlay)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: "var(--ss-text2)" }} />
                  <Bar dataKey="aprobadas" name="Aprobadas" fill="#6cbe45" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="versiones" name="Versiones enviadas" fill="#7dd3fc" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rechazadas" name="Rechazadas" fill="#ee2346" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* PREMIOS DISPONIBLES */}
      <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-[var(--ss-text)]">
          <Gift size={16} className="text-[#ee2346]" /> Premios disponibles
        </h2>
        <div className="space-y-3">
          {premios.length === 0 && (
            <div className="text-sm text-[var(--ss-text3)] py-2">No hay premios disponibles</div>
          )}
          {premios.map((p) => {
            const canAfford = perfil.chilliPoints >= p.puntos_costo;
            return (
              <div
                key={p.id_premio}
                className="rounded-xl border border-[var(--ss-border)] bg-[var(--ss-raised)] p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-[var(--ss-text)]">{p.nombre}</div>
                  <div className="text-xs text-[var(--ss-text3)] mt-0.5 leading-snug">{p.descripcion}</div>
                  <span className="inline-block mt-1.5 text-xs font-bold text-[#ee2346]">{"🌶 " + p.puntos_costo + " pts"}</span>
                </div>
                <button
                  disabled={!canAfford || canjeando === p.id_premio}
                  onClick={() => canjearPremio(p.id_premio)}
                  className={
                    "shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-colors " +
                    (canAfford && canjeando !== p.id_premio
                      ? "bg-[#6cbe45] hover:bg-[#5aaa3c] text-white"
                      : "bg-[var(--ss-overlay)] text-[var(--ss-text3)] cursor-not-allowed opacity-60")
                  }
                >
                  {canjeando === p.id_premio ? "Canjeando…" : "Canjear"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* HISTORIAL DE CANJES */}
      <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6">
        <h2 className="mb-4 font-semibold text-[var(--ss-text)]">Historial de canjes</h2>
        <div className="space-y-3">
          {redenciones.length === 0 && (
            <div className="text-sm text-[var(--ss-text3)] py-2">No hay premios canjeados</div>
          )}
          {redenciones.map((r) => (
            <div
              key={r.id_canje}
              className="rounded-xl border border-[var(--ss-border)] bg-[var(--ss-raised)] p-4 flex justify-between items-center gap-4"
            >
              <div className="min-w-0">
                <div className="font-semibold text-sm text-[var(--ss-text)]">{r.premio_nombre}</div>
                <div className="text-xs text-[#ee2346] font-medium mt-0.5">{"🌶 " + r.puntos_usados + " pts"}</div>
                <div className="text-xs text-[var(--ss-text3)] mt-0.5">
                  {new Date(r.fecha_canje).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
              {r.estado === "ACTIVO" ? (
                <button
                  onClick={() => marcarUsado(r.id_canje)}
                  className="shrink-0 flex items-center gap-2 text-xs font-semibold bg-[#ee2346] hover:bg-[#cc1f3d] text-white px-3 py-2 rounded-xl transition-colors"
                >
                  <CheckCircle size={14} />
                  Marcar usado
                </button>
              ) : (
                <span className="shrink-0 text-xs font-semibold text-[#6cbe45] bg-[#6cbe45]/10 px-3 py-1.5 rounded-xl">Usado</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* HISTORIAL DE AJUSTES MANUALES */}
      <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-6">
        <h2 className="mb-4 font-semibold text-[var(--ss-text)]">Historial de ajustes manuales</h2>
        <div className="space-y-3">
          {ajustes.length === 0 && (
            <div className="text-sm text-[var(--ss-text3)] py-2">No hay ajustes manuales registrados</div>
          )}
          {ajustes.map((a) => (
            <div
              key={a.id_movimiento}
              className="rounded-xl border border-[var(--ss-border)] bg-[var(--ss-raised)] p-4 flex justify-between items-center gap-4"
            >
              <div className="min-w-0">
                <div className="font-semibold text-sm text-[var(--ss-text)]">{a.motivo}</div>
                <div className="text-xs text-[var(--ss-text3)] mt-0.5">
                  {new Date(a.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                  {" · "}{a.admin_nombre}
                </div>
              </div>
              <span className={"shrink-0 text-xs font-bold " + (a.puntos > 0 ? "text-[#6cbe45]" : "text-[#ee2346]")}>
                {(a.puntos > 0 ? "+" : "") + a.puntos + " 🌶"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: AJUSTAR CHILLI POINTS */}
      {showAjuste && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-2xl overflow-hidden">

            <div className="px-5 py-4 border-b border-[var(--ss-border)] flex items-center justify-between">
              <h3 className="font-semibold text-[var(--ss-text)] flex items-center gap-2">
                <span>🌶</span> Ajustar Chilli Points
              </h3>
              <button onClick={cerrarAjuste} className="text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition p-1 rounded-lg hover:bg-[var(--ss-overlay)]">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAjusteForm({ ...ajusteForm, tipo: "sumar" })}
                  className={
                    "rounded-xl px-3 py-2.5 text-sm font-semibold border transition " +
                    (ajusteForm.tipo === "sumar"
                      ? "bg-[#6cbe45]/15 border-[#6cbe45]/50 text-[#6cbe45]"
                      : "border-[var(--ss-border)] text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)]")
                  }
                >
                  + Sumar puntos
                </button>
                <button
                  type="button"
                  onClick={() => setAjusteForm({ ...ajusteForm, tipo: "restar" })}
                  className={
                    "rounded-xl px-3 py-2.5 text-sm font-semibold border transition " +
                    (ajusteForm.tipo === "restar"
                      ? "bg-[#ee2346]/15 border-[#ee2346]/50 text-[#ee2346]"
                      : "border-[var(--ss-border)] text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)]")
                  }
                >
                  − Restar puntos
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">Cantidad de puntos</label>
                <input
                  type="number"
                  min={1}
                  placeholder="Ej: 10"
                  value={ajusteForm.puntos}
                  onChange={e => setAjusteForm({ ...ajusteForm, puntos: e.target.value })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-[var(--ss-input)] text-[var(--ss-text)] border border-[var(--ss-border)] outline-none focus:ring-2 focus:ring-[#6cbe45]/25 focus:border-[#6cbe45]/60 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">Motivo del ajuste</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Corrección por error en tarea #123"
                  value={ajusteForm.motivo}
                  onChange={e => setAjusteForm({ ...ajusteForm, motivo: e.target.value })}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-[var(--ss-input)] text-[var(--ss-text)] border border-[var(--ss-border)] outline-none focus:ring-2 focus:ring-[#6cbe45]/25 focus:border-[#6cbe45]/60 transition resize-none"
                />
              </div>

              {ajusteError && (
                <p className="text-sm text-[#ee2346] bg-[#ee2346]/10 border border-[#ee2346]/30 rounded-md px-3 py-2">
                  {ajusteError}
                </p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-[var(--ss-border)] flex justify-end gap-2">
              <button
                onClick={cerrarAjuste}
                className="rounded-xl border border-[var(--ss-border)] px-4 py-2 text-sm text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] transition"
              >
                Cancelar
              </button>
              <button
                disabled={ajustando}
                onClick={guardarAjuste}
                className="rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
              >
                {ajustando ? "Guardando…" : "Aplicar ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ── COMPONENTS ── */

function StatCard({ title, value, sub, accent }: {
  title: string;
  value: number;
  sub: string;
  accent?: "green" | "yellow";
}) {
  const valColor = accent === "green" ? "text-[#6cbe45]" : accent === "yellow" ? "text-yellow-500 dark:text-[#facc15]" : "text-[var(--ss-text)]";
  const strip    = accent === "green" ? "bg-[#6cbe45]" : accent === "yellow" ? "bg-[#facc15]" : "bg-[var(--ss-border)]";
  return (
    <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-5 flex flex-col gap-2 relative overflow-hidden hover:border-[var(--ss-text3)]/40 transition-colors">
      <div className={"absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl " + strip} />
      <p className="text-xs text-[var(--ss-text3)] pl-2">{title}</p>
      <p className={valColor + " text-3xl font-bold pl-2"}>{value}</p>
      <p className="text-xs text-[var(--ss-text3)] pl-2">{sub}</p>
    </div>
  );
}

function MetricCard({ icon, title, value, sub, color, progress }: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  sub: string;
  color: MetricCardColor;
  progress?: number;
}) {
  const accentColor: Record<MetricCardColor, string> = {
    green:   "bg-[#6cbe45]",
    red:     "bg-[#ee2346]",
    yellow:  "bg-[#facc15]",
    blue:    "bg-[#7dd3fc]",
    neutral: "bg-[var(--ss-border)]",
  };
  const iconColor: Record<MetricCardColor, string> = {
    green:   "text-[#6cbe45]",
    red:     "text-[#ee2346]",
    yellow:  "text-yellow-500 dark:text-[#facc15]",
    blue:    "text-sky-500 dark:text-[#7dd3fc]",
    neutral: "text-[var(--ss-text3)]",
  };
  const valueColors: Record<MetricCardColor, string> = {
    green:   "text-[#6cbe45]",
    red:     "text-[#ee2346]",
    yellow:  "text-yellow-500 dark:text-[#facc15]",
    blue:    "text-sky-500 dark:text-[#7dd3fc]",
    neutral: "text-[var(--ss-text)]",
  };

  return (
    <div className="rounded-2xl border border-[var(--ss-border)] bg-[var(--ss-surface)] p-5 flex flex-col gap-2 relative overflow-hidden hover:border-[var(--ss-text3)]/40 transition-colors">
      <div className={"absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl " + accentColor[color]} />
      <div className={"flex items-center gap-2 text-xs pl-2 " + iconColor[color]}>
        {icon}
        <span className="text-[var(--ss-text2)]">{title}</span>
      </div>
      <p className={valueColors[color] + " text-2xl font-bold pl-2"}>{value}</p>
      {progress !== undefined && (
        <div className="h-1.5 rounded-full bg-[var(--ss-overlay)] mx-2">
          <div
            className={"h-1.5 rounded-full transition-all " + accentColor[color]}
            style={{ width: Math.min(progress, 100) + "%" }}
          />
        </div>
      )}
      <p className="text-xs text-[var(--ss-text3)] leading-tight pl-2">{sub}</p>
    </div>
  );
}

function ChilliCard({ points, onAdjust }: { points: number; onAdjust?: () => void }) {
  const heatColor =
    points >= 100 ? "text-yellow-300" :
    points >= 50  ? "text-orange-300" :
    points >= 20  ? "text-red-300" :
    "text-red-200/60";

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden hover:brightness-110 transition-all"
      style={{ background: "linear-gradient(135deg, #ee2346 0%, #b91c1c 60%, #7f1d1d 100%)" }}
    >
      <div
        className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #ff6b6b, transparent)" }}
      />
      <span className="absolute right-2 top-1 text-6xl opacity-25 select-none rotate-12 pointer-events-none">
        🌶
      </span>
      {onAdjust && (
        <button
          onClick={onAdjust}
          className="absolute right-2 bottom-2 z-10 flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-2.5 py-1.5 transition-colors"
        >
          <Edit2 size={12} /> Ajustar
        </button>
      )}
      <div className="flex items-center gap-2 text-xs text-white/70 relative z-10">
        <span className="text-sm">🌶</span>
        Chilli Points
      </div>
      <p className="text-3xl font-bold text-white relative z-10">{points}</p>
      <div className="flex items-center gap-2 relative z-10">
        <p className="text-xs text-white/50">puntos disponibles</p>
        <span className={"text-xs font-bold " + heatColor}>🔥</span>
      </div>
    </div>
  );
}
