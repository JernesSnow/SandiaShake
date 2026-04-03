"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, ChevronLeft, ChevronRight } from "react-feather";

type Accion = {
  id_accion: number;
  id_usuario: number | null;
  tabla_afectada: string;
  id_registro: number | null;
  accion: "CREATE" | "UPDATE" | "DELETE" | "SOFT_DELETE";
  datos_antes: string | null;
  datos_despues: string | null;
  fecha_accion: string;
  actor: { nombre: string; correo: string; rol: string } | { nombre: string; correo: string; rol: string }[] | null;
};

const ACCION_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  CREATE:      { bg: "bg-[#6cbe45]/15",  text: "text-[#6cbe45]",  border: "border-[#6cbe45]/30",  label: "Creación"      },
  UPDATE:      { bg: "bg-[#7dd3fc]/15",  text: "text-[#7dd3fc]",  border: "border-[#7dd3fc]/30",  label: "Actualización" },
  DELETE:      { bg: "bg-[#ee2346]/15",  text: "text-[#ee2346]",  border: "border-[#ee2346]/30",  label: "Eliminación"   },
  SOFT_DELETE: { bg: "bg-[#f97316]/15",  text: "text-[#f97316]",  border: "border-[#f97316]/30",  label: "Desactivación" },
};

const TABLA_LABELS: Record<string, string> = {
  usuarios:       "Usuarios",
  tareas:         "Tareas",
  entregables:    "Entregables",
  organizaciones: "Organizaciones",
  premios:        "Premios",
  facturas:       "Facturas",
};

const selectCls =
  "rounded-xl px-3 py-2 text-sm bg-[var(--ss-input)] text-[var(--ss-text)] " +
  "border border-[var(--ss-border)] outline-none " +
  "focus:ring-2 focus:ring-[#6cbe45]/25 focus:border-[#6cbe45]/60 transition";

function JsonPreview({ raw }: { raw: string | null }) {
  if (!raw) return <span className="text-[var(--ss-text3)] italic text-[10px]">—</span>;
  try {
    const obj = JSON.parse(raw);
    return (
      <span className="font-mono text-[10px] text-[var(--ss-text3)] break-all">
        {Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(" · ")}
      </span>
    );
  } catch {
    return <span className="font-mono text-[10px] text-[var(--ss-text3)]">{raw}</span>;
  }
}

export default function BitacoraSection() {
  const [acciones, setAcciones]       = useState<Accion[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [loading, setLoading]         = useState(false);
  const [filterTabla, setFilterTabla] = useState("");
  const [filterAccion, setFilterAccion] = useState("");

  const fetchData = useCallback(async (p: number, tabla: string, accion: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (tabla)  params.set("tabla",  tabla);
      if (accion) params.set("accion", accion);
      const res  = await fetch("/api/admin/bitacora?" + params.toString(), { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setAcciones(json.acciones ?? []);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 1);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(1, "", ""); }, [fetchData]);

  function applyFilters() { setPage(1); fetchData(1, filterTabla, filterAccion); }

  function changePage(p: number) { setPage(p); fetchData(p, filterTabla, filterAccion); }

  function clearFilters() { setFilterTabla(""); setFilterAccion(""); setPage(1); fetchData(1, "", ""); }

  return (
    <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold text-[var(--ss-text)] flex items-center gap-2">
            <Activity size={16} className="text-[#facc15]" /> Bitácora de acciones
          </h2>
          <p className="text-xs text-[var(--ss-text3)] mt-0.5">
            Registro de todas las acciones realizadas por administradores y colaboradores.
          </p>
        </div>
        <span className="text-xs text-[var(--ss-text3)] shrink-0 self-center">
          {total} registro{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterTabla} onChange={e => setFilterTabla(e.target.value)} className={selectCls}>
          <option value="">Todas las tablas</option>
          {Object.entries(TABLA_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        <select value={filterAccion} onChange={e => setFilterAccion(e.target.value)} className={selectCls}>
          <option value="">Todas las acciones</option>
          {Object.entries(ACCION_COLORS).map(([val, cfg]) => (
            <option key={val} value={val}>{cfg.label}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={applyFilters}
          className="rounded-xl bg-[#ee2346] hover:bg-[#d8203f] px-4 py-2 text-sm font-semibold text-white transition"
        >
          Filtrar
        </button>

        <button
          type="button"
          onClick={clearFilters}
          className="rounded-xl border border-[var(--ss-border)] px-4 py-2 text-sm text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] transition"
        >
          Limpiar
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--ss-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--ss-raised)] border-b border-[var(--ss-border)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--ss-text2)]">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--ss-text2)]">Actor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--ss-text2)]">Acción</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--ss-text2)]">Tabla</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--ss-text2)]">Registro</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--ss-text2)]">Cambios</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--ss-text3)]">Cargando…</td>
                </tr>
              ) : acciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--ss-text3)]">Sin registros en la bitácora.</td>
                </tr>
              ) : acciones.map((a) => {
                const cfg   = ACCION_COLORS[a.accion] ?? ACCION_COLORS["UPDATE"];
                const fecha = new Date(a.fecha_accion);
                const actor = Array.isArray(a.actor) ? a.actor[0] : a.actor;

                return (
                  <tr key={a.id_accion} className="border-t border-[var(--ss-border)] hover:bg-[var(--ss-overlay)] transition">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-[var(--ss-text2)]">
                        {fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" })}
                      </div>
                      <div className="text-[11px] text-[var(--ss-text3)]">
                        {fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {actor ? (
                        <div>
                          <div className="text-xs font-medium text-[var(--ss-text)]">{actor.nombre}</div>
                          <div className="text-[11px] text-[var(--ss-text3)]">{actor.rol}</div>
                        </div>
                      ) : (
                        <span className="text-[var(--ss-text3)] italic text-xs">Sistema</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-[var(--ss-text2)]">
                      {TABLA_LABELS[a.tabla_afectada] ?? a.tabla_afectada}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-[var(--ss-text3)]">
                      #{a.id_registro ?? "—"}
                    </td>

                    <td className="px-4 py-3 max-w-[280px]">
                      <div className="flex flex-col gap-0.5">
                        {a.datos_antes && (
                          <div className="flex items-start gap-1">
                            <span className="text-[var(--ss-text3)] text-[10px] mt-0.5 shrink-0">antes</span>
                            <JsonPreview raw={a.datos_antes} />
                          </div>
                        )}
                        {a.datos_despues && (
                          <div className="flex items-start gap-1">
                            <span className="text-[#6cbe45]/70 text-[10px] mt-0.5 shrink-0">después</span>
                            <JsonPreview raw={a.datos_despues} />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => changePage(Math.max(1, page - 1))}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--ss-border)] px-3 py-1.5 text-xs text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] disabled:opacity-30 transition"
          >
            <ChevronLeft size={13} /> Anterior
          </button>
          <span className="text-xs text-[var(--ss-text3)]">Página {page} de {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => changePage(Math.min(totalPages, page + 1))}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--ss-border)] px-3 py-1.5 text-xs text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] disabled:opacity-30 transition"
          >
            Siguiente <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
