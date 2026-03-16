"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, X } from "react-feather";

/* ================= TYPES ================= */

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

/* ================= UTILS ================= */

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function totalEntregables(p: PlanContenido) {
  return p.servicios.reduce((acc, s) => acc + (s.cantidad || 0), 0);
}

/* ================= COMPONENT ================= */

export default function PlanesEntregablesSection() {
  const [planes, setPlanes] = useState<PlanContenido[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
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

      const normalized = (json?.data ?? []).map((p: any) => ({
        ...p,
        servicios: p.servicios ?? [],
      }));

      setPlanes(normalized);
    } catch {
      alert("Error cargando planes.");
    } finally {
      setLoading(false);
    }
  }

  async function cargarServicios() {
    const res = await fetch("/api/admin/servicios");
    const json = await res.json();
    setServicios(json?.data ?? []);
  }

  useEffect(() => {
    cargarPlanes();
    cargarServicios();
  }, []);

  /* ================= CRUD ================= */

  function openNew() {
    setIsNew(true);
    setEditingPlan({
      id_plan: 0,
      nombre: "",
      descripcion: "",
      precio: 0,
      estado: "ACTIVO",
      servicios: [],
    });
  }

  function openEdit(p: PlanContenido) {
    setIsNew(false);
    setEditingPlan(JSON.parse(JSON.stringify(p)));
  }

  async function savePlan(p: PlanContenido) {
    const endpoint = isNew
      ? "/api/admin/planes-contenido"
      : `/api/admin/planes-contenido/${p.id_plan}`;

    const method = isNew ? "POST" : "PATCH";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json?.error ?? "Error guardando plan.");
      return;
    }

    await cargarPlanes();
    setEditingPlan(null);
  }

  async function deletePlan(id: number) {
    if (!confirm("¿Desactivar este plan?")) return;

    await fetch(`/api/admin/planes-contenido/${id}`, {
      method: "DELETE",
    });

    cargarPlanes();
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
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold bg-[#ee2346] hover:bg-[#d8203f] text-white"
          >
            <Plus size={16} />
            Nuevo plan
          </button>
        </div>

        {/* GRID */}
        <div className="grid md:grid-cols-2 gap-6">

          {planes.map((p) => (
            <div
              key={p.id_plan}
              className="bg-[#2b2b30] border border-[#4a4748]/40 rounded-xl p-6 space-y-4"
            >

              <div className="flex justify-between">
                <div>
                  <h3 className="text-white font-semibold">{p.nombre}</h3>
                  <p className="text-xs text-gray-400">{p.descripcion}</p>
                </div>

                <span className="text-xs px-2 py-1 rounded bg-[#6cbe45]/20 text-[#6cbe45]">
                  {p.estado}
                </span>
              </div>

              {/* SERVICES */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {p.servicios.map((s) => (
                  <Item key={s.id_servicio} label={s.nombre} value={s.cantidad} />
                ))}

                <Item
                  label="Total"
                  value={totalEntregables(p)}
                  highlight
                />
              </div>

              <div className="text-right text-white font-semibold">
                ₡{p.precio.toLocaleString("es-CR")} / mes
              </div>

              <div className="flex justify-end gap-3 border-t border-[#4a4748]/30 pt-3">
                <button
                  onClick={() => openEdit(p)}
                  className="text-[#7dd3fc]"
                >
                  <Edit2 size={16} />
                </button>

                <button
                  onClick={() => deletePlan(p.id_plan)}
                  className="text-[#ee2346]"
                >
                  <Trash2 size={16} />
                </button>
              </div>

            </div>
          ))}

        </div>

        {/* ================= MODAL ================= */}

        {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">

          <div className="w-[92vw] max-w-4xl rounded-xl bg-[#333132] border border-[#4a4748]/40 shadow-lg p-8 space-y-6 max-h-[90vh] overflow-y-auto">

            {/* HEADER */}
            <div className="flex justify-between items-center">
              <h3 className="text-white font-semibold text-lg">
                {isNew ? "Nuevo plan de contenido" : "Editar plan"}
              </h3>
            </div>

            {/* PLAN INFO */}
            <div className="grid grid-cols-2 gap-4">

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Nombre</label>
                <input
                  value={editingPlan.nombre}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, nombre: e.target.value })
                  }
                  className="rounded-md bg-[#1a1a1d] border border-[#3a3a40] text-white px-3 py-2"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Precio mensual (CRC)</label>
                <input
                  type="number"
                  value={editingPlan.precio}
                  onChange={(e) =>
                    setEditingPlan({
                      ...editingPlan,
                      precio: Number(e.target.value || 0),
                    })
                  }
                  className="rounded-md bg-[#1a1a1d] border border-[#3a3a40] text-white px-3 py-2"
                />
              </div>

            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Descripción</label>
              <textarea
                value={editingPlan.descripcion ?? ""}
                onChange={(e) =>
                  setEditingPlan({ ...editingPlan, descripcion: e.target.value })
                }
                className="rounded-md bg-[#1a1a1d] border border-[#3a3a40] text-white px-3 py-2"
              />
            </div>

            {/* SERVICES SECTION */}
            <div className="space-y-4">

              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">
                  Servicios incluidos
                </h4>

                <button
                  type="button"
                  onClick={() =>
                    setEditingPlan({
                      ...editingPlan,
                      servicios: [
                        ...editingPlan.servicios,
                        { id_servicio: 0, nombre: "", cantidad: 1 },
                      ],
                    })
                  }
                  className="text-sm text-[#6cbe45] hover:text-[#7ed957]"
                >
                  + Agregar servicio
                </button>
              </div>

              {/* SERVICE LIST */}
              <div className="space-y-3">

                {editingPlan.servicios.map((s, i) => (

                  <div
                    key={i}
                    className="grid grid-cols-[1fr_120px_40px] gap-3 items-center bg-[#2b2b30] border border-[#4a4748]/40 rounded-lg p-3"
                  >

                    {/* SERVICE SELECT */}
                    <select
                      value={s.id_servicio}
                      onChange={(e) => {
                        const servicio = servicios.find(
                          (x) => x.id_servicio === Number(e.target.value)
                        );

                        const copy = [...editingPlan.servicios];

                        copy[i] = {
                          ...copy[i],
                          id_servicio: servicio?.id_servicio || 0,
                          nombre: servicio?.nombre || "",
                        };

                        setEditingPlan({
                          ...editingPlan,
                          servicios: copy,
                        });
                      }}
                      className="rounded-md bg-[#1a1a1d] border border-[#3a3a40] text-white px-3 py-2"
                    >
                      <option value="">Selecciona servicio</option>

                      {servicios.map((srv) => (
                        <option key={srv.id_servicio} value={srv.id_servicio}>
                          {srv.nombre}
                        </option>
                      ))}
                    </select>

                    {/* QUANTITY */}
                    <input
                      type="number"
                      min={1}
                      value={s.cantidad}
                      onChange={(e) => {
                        const copy = [...editingPlan.servicios];
                        copy[i].cantidad = Number(e.target.value || 1);

                        setEditingPlan({
                          ...editingPlan,
                          servicios: copy,
                        });
                      }}
                      className="rounded-md bg-[#1a1a1d] border border-[#3a3a40] text-white px-3 py-2"
                    />

                    {/* REMOVE */}
                    <button
                      onClick={() => {
                        const copy = editingPlan.servicios.filter(
                          (_, idx) => idx !== i
                        );

                        setEditingPlan({
                          ...editingPlan,
                          servicios: copy,
                        });
                      }}
                      className="text-[#ee2346] hover:text-white"
                    >
                      <X size={16} />
                    </button>

                  </div>

                ))}

              </div>

            </div>

            {/* SUMMARY */}
            <div className="flex justify-between items-center pt-4 border-t border-[#4a4748]/40">

              <div className="text-sm text-gray-400">
                Total entregables:{" "}
                <span className="text-white font-semibold">
                  {totalEntregables(editingPlan)}
                </span>
              </div>

              <div className="text-sm text-gray-400">
                Precio plan:{" "}
                <span className="text-white font-semibold">
                  ₡{editingPlan.precio.toLocaleString("es-CR")}
                </span>
              </div>

            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#4a4748]/30">

              <button
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 border border-[#4a4748]/40 rounded-md text-gray-300 hover:bg-[#3a3738]"
              >
                Cancelar
              </button>

              <button
                onClick={() => savePlan(editingPlan)}
                className="px-5 py-2 bg-[#6cbe45] hover:bg-[#5fa93d] rounded-md text-white font-semibold"
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

/* ================= ITEM COMPONENT ================= */

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
          ? "bg-[#6cbe45]/15 text-[#6cbe45]"
          : "bg-[#1f1f24] text-gray-300"
      }`}
    >
      <div className="text-xs opacity-60">{label}</div>
      <div className="text-lg">{value}</div>
    </div>
  );
}