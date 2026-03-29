"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import {
  Gift, CheckCircle, Clock, TrendingUp,
  AlertTriangle, CheckSquare, RefreshCw, Archive,
} from "react-feather";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

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
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);

  const [perfil, setPerfil] = useState<Colaborador | null>(null);
  const [premios, setPremios] = useState<Premio[]>([]);
  const [redenciones, setRedenciones] = useState<Redencion[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [canjeando, setCanjeando] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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
      const [colabRes, premiosRes, redencionesRes, metricasRes] = await Promise.all([
        fetch("/api/admin/colaboradores", { cache: "no-store" }),
        fetch("/api/admin/premios", { cache: "no-store" }),
        fetch("/api/rewards/redemptions?id_colaborador=" + id, { cache: "no-store" }),
        fetch("/api/admin/colaboradores/metricas?id_colaborador=" + id, { cache: "no-store" }),
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
    return (
      <Shell>
        <div className="text-[#fffef9]/60">Cargando colaborador...</div>
      </Shell>
    );
  }

  if (!perfil) {
    return (
      <Shell>
        <div className="text-[#fffef9]/60">No se pudo cargar el colaborador</div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col gap-8 text-[#fffef9]">

        {/* PROFILE */}
        <div className="rounded-xl border border-[#4a4748]/40 bg-[#2b2b30] p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#ee2346] to-[#7dd3fc] text-xl font-bold">
              {perfil.nombre?.charAt(0) ?? "C"}
            </div>
            <div>
              <h1 className="text-xl font-bold">{perfil.nombre}</h1>
              <p className="text-sm text-[#fffef9]/60">{perfil.email}</p>
            </div>
          </div>
        </div>

        {/* MÉTRICAS */}
        {metricas && (
          <div className="flex flex-col gap-6">
            <h2 className="text-lg font-bold">Métricas de Desempeño</h2>

            {/* ROW 0 — overview */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Tareas totales" value={metricas.totalTareas} sub="asignadas" />
              <StatCard title="Pendientes" value={metricas.tareasPendientes} sub="sin completar" accent="yellow" />
              <StatCard title="Aprobadas" value={metricas.tareasAprobadas} sub={"de " + metricas.totalTareas + " tareas"} accent="green" />
              <ChilliCard points={perfil.chilliPoints} />
            </div>

            {/* DIVIDER */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#4a4748]/30" />
              <span className="text-xs text-[#fffef9]/30 uppercase tracking-widest">rendimiento</span>
              <div className="h-px flex-1 bg-[#4a4748]/30" />
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
              <div className="rounded-xl border border-[#4a4748]/40 bg-[#2b2b30] p-6">
                <h3 className="mb-4 font-semibold text-sm text-[#fffef9]/80">
                  Actividad últimos 6 meses
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={metricas.porMes} barGap={4}>
                    <XAxis dataKey="mes" tick={{ fill: "#fffef9", fontSize: 11, opacity: 0.6 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#fffef9", fontSize: 11, opacity: 0.6 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#1f1f24", border: "1px solid #4a474840", borderRadius: 8, color: "#fffef9", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#fffef9", opacity: 0.7 }} />
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
        <div className="rounded-xl border border-[#4a4748]/40 bg-[#2b2b30] p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Gift size={16} /> Premios
          </h2>
          <div className="space-y-3">
            {premios.length === 0 && (
              <div className="text-xs text-[#fffef9]/50">No hay premios disponibles</div>
            )}
            {premios.map((p) => {
              const canAfford = perfil.chilliPoints >= p.puntos_costo;
              return (
                <div key={p.id_premio} className="rounded-lg border border-[#4a4748]/30 bg-[#1f1f24] p-4">
                  <div className="font-semibold">{p.nombre}</div>
                  <div className="mb-3 text-xs text-[#fffef9]/60">{p.descripcion}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#ee2346]">{"🌶 " + p.puntos_costo}</span>
                    <button
                      disabled={!canAfford || canjeando === p.id_premio}
                      onClick={() => canjearPremio(p.id_premio)}
                      className={
                        canAfford && canjeando !== p.id_premio
                          ? "rounded px-3 py-1 text-xs bg-[#6cbe45] hover:bg-[#5aaa3c] transition-colors"
                          : "rounded px-3 py-1 text-xs cursor-not-allowed bg-[#4a4748] opacity-50"
                      }
                    >
                      {canjeando === p.id_premio ? "Canjeando..." : "Canjear"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PREMIOS CANJEADOS */}
        <div className="rounded-xl border border-[#4a4748]/40 bg-[#2b2b30] p-6">
          <h2 className="mb-4 font-semibold">Premios Canjeados</h2>
          <div className="space-y-3">
            {redenciones.length === 0 && (
              <div className="text-xs text-[#fffef9]/50">No hay premios canjeados</div>
            )}
            {redenciones.map((r) => (
              <div
                key={r.id_canje}
                className="rounded-lg border border-[#4a4748]/30 bg-[#1f1f24] p-4 flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold">{r.premio_nombre}</div>
                  <div className="text-xs text-[#fffef9]/60">{"🌶 " + r.puntos_usados}</div>
                  <div className="text-xs text-[#fffef9]/40">
                    {new Date(r.fecha_canje).toLocaleDateString()}
                  </div>
                </div>
                {r.estado === "ACTIVO" ? (
                  <button
                    onClick={() => marcarUsado(r.id_canje)}
                    className="flex items-center gap-2 text-xs bg-[#ee2346] hover:bg-[#cc1f3d] px-3 py-1 rounded transition-colors"
                  >
                    <CheckCircle size={14} />
                    Marcar usado
                  </button>
                ) : (
                  <span className="text-xs text-[#6cbe45] font-semibold">Usado</span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </Shell>
  );
}

/* ── COMPONENTS ── */

function StatCard({ title, value, sub, accent }: {
  title: string;
  value: number;
  sub: string;
  accent?: "green" | "yellow";
}) {
  const valColor = accent === "green" ? "text-[#6cbe45]" : accent === "yellow" ? "text-[#facc15]" : "text-[#fffef9]";
  const strip = accent === "green" ? "bg-[#6cbe45]" : accent === "yellow" ? "bg-[#facc15]" : "bg-[#4a4748]";
  return (
    <div className="rounded-xl border border-[#4a4748]/40 bg-[#2b2b30] p-5 flex flex-col gap-2 relative overflow-hidden hover:border-[#4a4748]/70 transition-colors">
      <div className={"absolute left-0 top-0 bottom-0 w-1 rounded-l-xl " + strip} />
      <p className="text-xs text-[#fffef9]/50 pl-1">{title}</p>
      <p className={valColor + " text-3xl font-bold pl-1"}>{value}</p>
      <p className="text-xs text-[#fffef9]/40 pl-1">{sub}</p>
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
    green: "bg-[#6cbe45]",
    red: "bg-[#ee2346]",
    yellow: "bg-[#facc15]",
    blue: "bg-[#7dd3fc]",
    neutral: "bg-[#4a4748]",
  };
  const iconColor: Record<MetricCardColor, string> = {
    green: "text-[#6cbe45]",
    red: "text-[#ee2346]",
    yellow: "text-[#facc15]",
    blue: "text-[#7dd3fc]",
    neutral: "text-[#fffef9]/50",
  };
  const valueColors: Record<MetricCardColor, string> = {
    green: "text-[#6cbe45]",
    red: "text-[#ee2346]",
    yellow: "text-[#facc15]",
    blue: "text-[#7dd3fc]",
    neutral: "text-[#fffef9]",
  };

  return (
    <div className="rounded-xl border border-[#4a4748]/40 bg-[#2b2b30] p-5 flex flex-col gap-2 relative overflow-hidden hover:border-[#4a4748]/70 transition-colors">
      <div className={"absolute left-0 top-0 bottom-0 w-1 rounded-l-xl " + accentColor[color]} />
      <div className={"flex items-center gap-2 text-xs text-[#fffef9]/60 pl-1 " + iconColor[color]}>
        {icon}
        <span className="text-[#fffef9]/60">{title}</span>
      </div>
      <p className={valueColors[color] + " text-2xl font-bold pl-1"}>{value}</p>
      {progress !== undefined && (
        <div className="h-1 rounded-full bg-[#4a4748]/40 mx-1">
          <div
            className={"h-1 rounded-full transition-all " + accentColor[color]}
            style={{ width: Math.min(progress, 100) + "%" }}
          />
        </div>
      )}
      <p className="text-xs text-[#fffef9]/40 leading-tight pl-1">{sub}</p>
    </div>
  );
}

function ChilliCard({ points }: { points: number }) {
  const heatColor =
    points >= 100 ? "text-yellow-300" :
    points >= 50  ? "text-orange-300" :
    points >= 20  ? "text-red-300" :
    "text-red-200/60";

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden hover:brightness-110 transition-all"
      style={{ background: "linear-gradient(135deg, #ee2346 0%, #b91c1c 60%, #7f1d1d 100%)" }}
    >
      <div
        className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #ff6b6b, transparent)" }}
      />
      <span className="absolute right-2 top-1 text-6xl opacity-25 select-none rotate-12 pointer-events-none">
        🌶
      </span>
      <div className="flex items-center gap-2 text-xs text-white/70 relative z-10">
        <span className="text-sm">🌶</span>
        Chilli Points
      </div>
      <p className="text-3xl font-bold text-white relative z-10">{points}</p>
      <div className="flex items-center gap-2 relative z-10">
        <p className="text-xs text-white/50">puntos disponibles</p>
        <span className={"text-xs font-bold " + heatColor}></span>
      </div>
    </div>
  );
}
