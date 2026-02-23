"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "react-feather";

/* ================= TYPES ================= */

type PlanContenido = {
  id_plan: number;
  nombre: string;
  descripcion: string | null;
  cantidad_arte: number;
  cantidad_reel: number;
  cantidad_copy: number;
  cantidad_video: number;
  cantidad_carrusel: number;
  precio: number;
  estado: "ACTIVO" | "INACTIVO" | "ELIMINADO";
};

/* ================= UTILS ================= */

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function totalEntregables(p: PlanContenido) {
  return (
    p.cantidad_arte +
    p.cantidad_reel +
    p.cantidad_copy +
    p.cantidad_video +
    p.cantidad_carrusel
  );
}

/* ================= COMPONENT ================= */

export default function PlanesEntregablesSection() {
  const [planes, setPlanes] = useState<PlanContenido[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanContenido | null>(null);
  const [isNew, setIsNew] = useState(false);

  /* ================= LOAD ================= */

  async function cargarPlanes() {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/planes-contenido", {
        credentials: "include",
      });

      const text = await res.text();
      const json = safeJsonParse(text);

      if (!res.ok) {
        alert(json?.error ?? "Error cargando planes.");
        return;
      }

      setPlanes(json?.data ?? []);
    } catch {
      alert("Error cargando planes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarPlanes();
  }, []);

  /* ================= CRUD ================= */

  function openNew() {
    setIsNew(true);
    setEditingPlan({
      id_plan: 0,
      nombre: "",
      descripcion: "",
      cantidad_arte: 0,
      cantidad_reel: 0,
      cantidad_copy: 0,
      cantidad_video: 0,
      cantidad_carrusel: 0,
      precio: 0,
      estado: "ACTIVO",
    });
  }

  function openEdit(p: PlanContenido) {
    setIsNew(false);
    setEditingPlan({ ...p });
  }

  async function savePlan(p: PlanContenido) {
    if (!p.nombre.trim()) {
      alert("Nombre requerido.");
      return;
    }

    const endpoint = isNew
      ? "/api/admin/planes-contenido"
      : `/api/admin/planes-contenido/${p.id_plan}`;

    const method = isNew ? "POST" : "PATCH";

    const res = await fetch(endpoint, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });

    const text = await res.text();
    const json = safeJsonParse(text);

    if (!res.ok) {
      alert(json?.error ?? "Error guardando plan.");
      return;
    }

    await cargarPlanes();
    setEditingPlan(null);
    setIsNew(false);
  }

  async function deletePlan(id: number) {
    if (!confirm("¿Desactivar este plan?")) return;

    const res = await fetch(`/api/admin/planes-contenido/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const text = await res.text();
    const json = safeJsonParse(text);

    if (!res.ok) {
      alert(json?.error ?? "Error eliminando.");
      return;
    }

    await cargarPlanes();
  }

  /* ================= RENDER ================= */

  return (
    <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
      <div className="p-6">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white">
            Planes de contenido
          </h2>

          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold bg-[#ee2346] hover:bg-[#d8203f] text-white transition"
          >
            <Plus size={16} />
            Nuevo plan
          </button>
        </div>

        {loading && (
          <p className="text-sm text-gray-300 mb-4">
            Cargando planes...
          </p>
        )}

        {/* PLANS GRID */}
        {planes.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            No hay planes creados.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {planes.map((p) => (
              <div
                key={p.id_plan}
                className="bg-[#2b2b30] border border-[#4a4748]/40 rounded-xl p-6 space-y-4"
              >
                {/* TITLE */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      {p.nombre}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {p.descripcion}
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      p.estado === "ACTIVO"
                        ? "bg-[#6cbe45]/20 text-[#6cbe45]"
                        : "bg-[#ee2346]/20 text-[#ee2346]"
                    }`}
                  >
                    {p.estado}
                  </span>
                </div>

                {/* ENTREGABLES PER COLUMN */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Item label="Arte" value={p.cantidad_arte} />
                  <Item label="Reel" value={p.cantidad_reel} />
                  <Item label="Copy" value={p.cantidad_copy} />
                  <Item label="Video" value={p.cantidad_video} />
                  <Item label="Carrusel" value={p.cantidad_carrusel} />
                  <Item
                    label="Total"
                    value={totalEntregables(p)}
                    highlight
                  />
                </div>

                {/* PRICE */}
                <div className="text-right text-white font-semibold">
                  ${p.precio.toFixed(2)} / mes
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-3 pt-3 border-t border-[#4a4748]/30">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-[#7dd3fc] hover:text-white"
                  >
                    <Edit2 size={16} />
                  </button>

                  <button
                    onClick={() => deletePlan(p.id_plan)}
                    className="text-[#ee2346] hover:text-white"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= MODAL ================= */}
        {editingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-2xl rounded-xl bg-[#333132] border border-[#4a4748]/40 shadow-lg p-8 space-y-6">

              <h3 className="text-white font-semibold text-lg">
                {isNew ? "Nuevo plan" : "Editar plan"}
              </h3>

              <input
                placeholder="Nombre"
                value={editingPlan.nombre}
                onChange={(e) =>
                  setEditingPlan((p) =>
                    p ? { ...p, nombre: e.target.value } : p
                  )
                }
                className="w-full rounded-md bg-[#1a1a1d] border border-[#3a3a40] text-white px-3 py-2"
              />

              <textarea
                placeholder="Descripción"
                value={editingPlan.descripcion ?? ""}
                onChange={(e) =>
                  setEditingPlan((p) =>
                    p ? { ...p, descripcion: e.target.value } : p
                  )
                }
                className="w-full rounded-md bg-[#1a1a1d] border border-[#3a3a40] text-white px-3 py-2"
              />

              {/* ENTREGABLE INPUTS */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  "cantidad_arte",
                  "cantidad_reel",
                  "cantidad_copy",
                  "cantidad_video",
                  "cantidad_carrusel",
                ].map((field) => (
                  <input
                    key={field}
                    type="number"
                    value={(editingPlan as any)[field]}
                    onChange={(e) =>
                      setEditingPlan((p) =>
                        p
                          ? { ...p, [field]: Number(e.target.value) }
                          : p
                      )
                    }
                    className="rounded-md bg-[#1a1a1d] border border-[#3a3a40] text-white px-3 py-2"
                  />
                ))}
              </div>

              <input
                type="number"
                placeholder="Precio mensual"
                value={editingPlan.precio}
                onChange={(e) =>
                  setEditingPlan((p) =>
                    p ? { ...p, precio: Number(e.target.value) } : p
                  )
                }
                className="w-full rounded-md bg-[#1a1a1d] border border-[#3a3a40] text-white px-3 py-2"
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-[#4a4748]/30">
                <button
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 border border-[#4a4748]/40 rounded-md text-gray-300"
                >
                  Cancelar
                </button>

                <button
                  onClick={() => savePlan(editingPlan)}
                  className="px-5 py-2 bg-[#6cbe45] rounded-md text-white font-semibold"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= SMALL ITEM COMPONENT ================= */

function Item({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2 text-center ${
        highlight
          ? "bg-[#6cbe45]/15 text-[#6cbe45] font-semibold"
          : "bg-[#1f1f24] text-gray-300"
      }`}
    >
      <div className="text-xs opacity-60">{label}</div>
      <div className="text-lg">{value}</div>
    </div>
  );
}
