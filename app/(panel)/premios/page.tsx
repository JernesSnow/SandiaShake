"use client";

import { useEffect, useState } from "react";
import { Gift, CheckCircle } from "react-feather";

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

async function safeJson(res: Response) {
  try {
    const t = await res.text();
    return t ? JSON.parse(t) : {};
  } catch {
    return {};
  }
}

export default function PremiosPage() {
  const [chilliPoints, setChilliPoints] = useState(0);
  const [premios, setPremios] = useState<Premio[]>([]);
  const [redenciones, setRedenciones] = useState<Redencion[]>([]);
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [loading, setLoading] = useState(true);
  const [canjeando, setCanjeando] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function cargarTodo() {
    try {
      setLoading(true);
      const [ptsRes, premiosRes, redencionesRes, ajustesRes] = await Promise.all([
        fetch("/api/colaborador/chilli-points", { cache: "no-store" }),
        fetch("/api/admin/premios", { cache: "no-store" }),
        fetch("/api/rewards/redemptions", { cache: "no-store" }),
        fetch("/api/colaborador/ajustes", { cache: "no-store" }),
      ]);

      if (ptsRes.ok) setChilliPoints((await safeJson(ptsRes)).chilliPoints ?? 0);
      if (premiosRes.ok) {
        const j = await safeJson(premiosRes);
        setPremios((j.premios ?? []).filter((p: any) => p.visible !== false));
      }
      if (redencionesRes.ok) setRedenciones((await safeJson(redencionesRes)).redenciones ?? []);
      if (ajustesRes.ok) setAjustes((await safeJson(ajustesRes)).ajustes ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargarTodo(); }, []);

  async function canjearPremio(idPremio: number) {
    setError("");
    try {
      setCanjeando(idPremio);
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_premio: idPremio }),
      });
      const j = await safeJson(res);
      if (!res.ok) {
        setError(j?.error ?? "No se pudo canjear");
        return;
      }
      await cargarTodo();
    } finally {
      setCanjeando(null);
    }
  }

  if (loading) {
    return <div className="text-[var(--ss-text3)]">Cargando…</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-[var(--ss-text)]">Premios</h1>
        <p className="text-sm text-[var(--ss-text3)] mt-0.5">Canjeá tus Chilli Points por premios.</p>
      </div>

      {/* CHILLI POINTS */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden max-w-sm"
        style={{ background: "linear-gradient(135deg, #ee2346 0%, #b91c1c 60%, #7f1d1d 100%)" }}
      >
        <span className="absolute right-2 top-1 text-6xl opacity-25 select-none rotate-12 pointer-events-none">🌶</span>
        <div className="flex items-center gap-2 text-xs text-white/70 relative z-10">
          <span className="text-sm">🌶</span> Chilli Points
        </div>
        <p className="text-3xl font-bold text-white relative z-10">{chilliPoints}</p>
        <p className="text-xs text-white/50 relative z-10">puntos disponibles</p>
      </div>

      {error && (
        <p className="text-sm text-[#ee2346] bg-[#ee2346]/10 border border-[#ee2346]/30 rounded-md px-3 py-2">
          {error}
        </p>
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
            const canAfford = chilliPoints >= p.puntos_costo;
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
                  {new Date(r.fecha_canje).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
              {r.estado === "ACTIVO" ? (
                <span className="shrink-0 text-xs font-semibold text-[#facc15] bg-[#facc15]/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  Pendiente de entrega
                </span>
              ) : (
                <span className="shrink-0 text-xs font-semibold text-[#6cbe45] bg-[#6cbe45]/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <CheckCircle size={14} /> Entregado
                </span>
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
                  {new Date(a.fecha).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" })}
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
    </div>
  );
}
