"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Package, X } from "react-feather";

/* ─── types ─── */

type Servicio = {
  id_servicio: number;
  nombre: string;
};

type PlanServicio = {
  id_servicio: number;
  nombre: string;
  cantidad: number;
};

type PlanContenido = {
  id_plan: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  estado: "ACTIVO" | "INACTIVO" | "ELIMINADO";
  servicios: PlanServicio[];
};

/* ─── utils ─── */

function safeJsonParse(text: string) {
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

function totalEntregables(p: PlanContenido) {
  return p.servicios.reduce((acc, s) => acc + (s.cantidad || 0), 0);
}

const inputCls =
  "w-full rounded-xl px-3 py-2.5 text-sm bg-[var(--ss-input)] text-[var(--ss-text)] " +
  "border border-[var(--ss-border)] outline-none " +
  "focus:ring-2 focus:ring-[#6cbe45]/25 focus:border-[#6cbe45]/60 transition";

/* ─── component ─── */

export default function PlanesEntregablesSection() {
  const [planes, setPlanes]       = useState<PlanContenido[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading]     = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanContenido | null>(null);
  const [isNew, setIsNew]         = useState(false);

  async function cargarPlanes() {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/planes-contenido");
      const text = await res.text();
      const json = safeJsonParse(text);
      if (!res.ok) { alert(json?.error ?? "Error cargando planes."); return; }
      setPlanes((json?.data ?? []).map((p: any) => ({ ...p, servicios: p.servicios ?? [] })));
    } catch { alert("Error cargando planes."); }
    finally   { setLoading(false); }
  }

  async function cargarServicios() {
    try {
      const res  = await fetch("/api/admin/servicios");
      const json = await res.json();
      setServicios(json?.data ?? []);
    } catch { console.error("Error cargando servicios"); }
  }

  useEffect(() => { cargarPlanes(); cargarServicios(); }, []);

  function openNew() {
    setIsNew(true);
    setEditingPlan({ id_plan: 0, nombre: "", descripcion: "", precio: 0, estado: "ACTIVO", servicios: [] });
  }

  function openEdit(p: PlanContenido) {
    setIsNew(false);
    setEditingPlan(JSON.parse(JSON.stringify(p)));
  }

  async function savePlan(p: PlanContenido) {
    const res  = await fetch("/api/admin/planes-contenido", {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    const json = await res.json();
    if (!res.ok) { alert(json?.error ?? "Error guardando plan."); return; }
    await cargarPlanes();
    setEditingPlan(null);
  }

  async function deletePlan(id: number) {
    if (!confirm("¿Desactivar este plan?")) return;
    await fetch(`/api/admin/planes-contenido?id=${id}`, { method: "DELETE" });
    cargarPlanes();
  }

  return (
    <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-6 mb-5">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-[var(--ss-text)] flex items-center gap-2">
          <Package size={16} className="text-[#ee2346]" /> Planes de contenido
        </h2>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#ee2346] hover:bg-[#d8203f] px-3 py-2 text-sm font-semibold text-white transition"
        >
          <Plus size={15} /> Nuevo plan
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--ss-text3)]">Cargando planes…</p>
      ) : planes.length === 0 ? (
        <p className="text-sm text-[var(--ss-text3)]">No hay planes registrados.</p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {planes.map((p) => (
            <div
              key={p.id_plan}
              className="rounded-2xl bg-[var(--ss-raised)] border border-[var(--ss-border)] p-5 space-y-4 hover:border-[#ee2346]/40 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-[var(--ss-text)] truncate">{p.nombre}</h3>
                  {p.descripcion && (
                    <p className="text-xs text-[var(--ss-text3)] mt-0.5 line-clamp-2">{p.descripcion}</p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-[#6cbe45]/15 text-[#6cbe45] border border-[#6cbe45]/30 font-medium">
                  {p.estado}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {p.servicios.map((s) => (
                  <ServiceItem key={s.id_servicio} label={s.nombre} value={s.cantidad} />
                ))}
                <ServiceItem label="Total piezas" value={totalEntregables(p)} highlight />
              </div>

              <div className="flex items-center justify-between border-t border-[var(--ss-border)] pt-3">
                <div className="text-[var(--ss-text)] font-semibold">
                  ₡{p.precio.toLocaleString("es-CR")}
                  <span className="text-xs text-[var(--ss-text3)] font-normal ml-1">/ mes</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)} className="text-[#7dd3fc] hover:text-[var(--ss-text)] transition p-1 rounded-lg hover:bg-[var(--ss-overlay)]">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => deletePlan(p.id_plan)} className="text-[#ee2346] hover:text-[var(--ss-text)] transition p-1 rounded-lg hover:bg-[var(--ss-overlay)]">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal ─── */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="sticky top-0 px-5 py-4 border-b border-[var(--ss-border)] flex items-center justify-between bg-[var(--ss-surface)] z-10">
              <h3 className="font-semibold text-[var(--ss-text)]">
                {isNew ? "Nuevo plan de contenido" : "Editar plan"}
              </h3>
              <button onClick={() => setEditingPlan(null)} className="text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition p-1 rounded-lg hover:bg-[var(--ss-overlay)]">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--ss-text2)] block">Nombre</label>
                  <input
                    value={editingPlan.nombre}
                    onChange={e => setEditingPlan({ ...editingPlan, nombre: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--ss-text2)] block">Precio mensual (CRC)</label>
                  <input
                    type="number"
                    value={editingPlan.precio}
                    onChange={e => setEditingPlan({ ...editingPlan, precio: Number(e.target.value || 0) })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">Descripción</label>
                <textarea
                  value={editingPlan.descripcion ?? ""}
                  onChange={e => setEditingPlan({ ...editingPlan, descripcion: e.target.value })}
                  rows={2}
                  className={inputCls + " resize-none"}
                />
              </div>

              {/* Services */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[var(--ss-text)]">Servicios incluidos</h4>
                  <button
                    type="button"
                    onClick={() => setEditingPlan({ ...editingPlan, servicios: [...editingPlan.servicios, { id_servicio: 0, nombre: "", cantidad: 1 }] })}
                    className="text-xs text-[#6cbe45] hover:text-[#5aa63d] transition"
                  >
                    + Agregar servicio
                  </button>
                </div>

                {editingPlan.servicios.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_110px_36px] gap-2 items-center rounded-xl bg-[var(--ss-raised)] border border-[var(--ss-border)] p-3">
                    <select
                      value={s.id_servicio}
                      onChange={e => {
                        const srv = servicios.find(x => x.id_servicio === Number(e.target.value));
                        const copy = [...editingPlan.servicios];
                        copy[i] = { ...copy[i], id_servicio: srv?.id_servicio || 0, nombre: srv?.nombre || "" };
                        setEditingPlan({ ...editingPlan, servicios: copy });
                      }}
                      className={inputCls}
                    >
                      <option value="">Selecciona servicio</option>
                      {servicios.map(srv => (
                        <option key={srv.id_servicio} value={srv.id_servicio}>{srv.nombre}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={s.cantidad}
                      onChange={e => {
                        const copy = [...editingPlan.servicios];
                        copy[i].cantidad = Number(e.target.value || 1);
                        setEditingPlan({ ...editingPlan, servicios: copy });
                      }}
                      className={inputCls}
                    />
                    <button
                      onClick={() => setEditingPlan({ ...editingPlan, servicios: editingPlan.servicios.filter((_, idx) => idx !== i) })}
                      className="flex items-center justify-center text-[#ee2346] hover:text-[var(--ss-text)] transition p-1 rounded-lg hover:bg-[var(--ss-overlay)]"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="flex justify-between items-center rounded-xl bg-[var(--ss-raised)] border border-[var(--ss-border)] px-4 py-3">
                <div className="text-sm text-[var(--ss-text2)]">
                  Total entregables <span className="text-[var(--ss-text)] font-semibold ml-2">{totalEntregables(editingPlan)}</span>
                </div>
                <div className="text-sm text-[var(--ss-text2)]">
                  Precio <span className="text-[var(--ss-text)] font-semibold ml-2">₡{editingPlan.precio.toLocaleString("es-CR")}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[var(--ss-border)] flex justify-end gap-2">
              <button
                onClick={() => setEditingPlan(null)}
                className="rounded-xl border border-[var(--ss-border)] px-4 py-2 text-sm text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => savePlan(editingPlan)}
                className="rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] px-5 py-2 text-sm font-semibold text-white transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── service item ─── */
function ServiceItem({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 text-center ${
      highlight
        ? "bg-[#6cbe45]/10 border border-[#6cbe45]/25 text-[#6cbe45]"
        : "bg-[var(--ss-input)] border border-[var(--ss-border)] text-[var(--ss-text2)]"
    }`}>
      <div className="text-[10px] opacity-75 mb-0.5">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}
