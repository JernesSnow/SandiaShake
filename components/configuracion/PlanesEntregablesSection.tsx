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
      const res = await fetch("/api/admin/planes-contenido");
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
    try {
      const res = await fetch("/api/admin/servicios");
      const json = await res.json();
      setServicios(json?.data ?? []);
    } catch {
      console.error("Error cargando servicios");
    }
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
    const endpoint = "/api/admin/planes-contenido";
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

    await fetch(`/api/admin/planes-contenido?id=${id}`, {
      method: "DELETE",
    });

    cargarPlanes();
  }

  /* ================= RENDER ================= */

  return (
    <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
      <div className="p-6">

        {/* HEADER */}

        <div className="flex justify-between items-center mb-8">
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

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">

          {planes.map((p) => (
            <div
              key={p.id_plan}
              className="bg-[#2b2b30] border border-[#4a4748]/40 rounded-xl p-6 space-y-5 hover:border-[#ee2346]/40 transition"
            >

              {/* HEADER */}

              <div className="flex items-start justify-between">

                <div>
                  <h3 className="text-white font-semibold text-lg">
                    {p.nombre}
                  </h3>

                  {p.descripcion && (
                    <p className="text-xs text-gray-400 mt-1">
                      {p.descripcion}
                    </p>
                  )}
                </div>

                <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#6cbe45]/20 text-[#6cbe45] font-medium">
                  {p.estado}
                </span>

              </div>

              {/* SERVICES */}

              <div className="grid grid-cols-2 gap-3">

                {p.servicios.map((s) => (
                  <Item
                    key={s.id_servicio}
                    label={s.nombre}
                    value={s.cantidad}
                  />
                ))}

                <Item
                  label="Total piezas"
                  value={totalEntregables(p)}
                  highlight
                />

              </div>

              {/* FOOTER */}

              <div className="flex items-center justify-between border-t border-[#4a4748]/30 pt-4">

                <div className="text-white font-semibold text-lg">
                  ₡{p.precio.toLocaleString("es-CR")}
                  <span className="text-xs text-gray-400 font-normal ml-1">
                    / mes
                  </span>
                </div>

                <div className="flex gap-3">

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(p);
                    }}
                    className="text-[#7dd3fc] hover:text-white transition"
                  >
                    <Edit2 size={16} />
                  </button>

                  <button
                    onClick={() => deletePlan(p.id_plan)}
                    className="text-[#ee2346] hover:text-white transition"
                  >
                    <Trash2 size={16} />
                  </button>

                </div>

              </div>

            </div>
          ))}

        </div>

        {/* ================= MODAL ================= */}

        {editingPlan && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">

          <div className="w-[92vw] max-w-4xl rounded-xl bg-[#333132] border border-[#4a4748]/40 shadow-lg p-8 space-y-6 max-h-[90vh] overflow-y-auto">

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
                <label className="text-xs text-gray-400">
                  Precio mensual (CRC)
                </label>

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

            {/* DESCRIPTION */}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Descripción</label>

              <textarea
                value={editingPlan.descripcion ?? ""}
                onChange={(e) =>
                  setEditingPlan({
                    ...editingPlan,
                    descripcion: e.target.value,
                  })
                }
                className="rounded-md bg-[#1a1a1d] border border-[#3a3a40] text-white px-3 py-2"
              />
            </div>

            {/* SERVICES */}

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

              <div className="space-y-3">

                {editingPlan.servicios.map((s, i) => (

                  <div
                    key={i}
                    className="grid grid-cols-[1fr_120px_40px] gap-3 items-center bg-[#2b2b30] border border-[#4a4748]/40 rounded-lg p-3"
                  >

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
                Total entregables
                <span className="text-white font-semibold ml-2">
                  {totalEntregables(editingPlan)}
                </span>
              </div>

              <div className="text-sm text-gray-400">
                Precio plan
                <span className="text-white font-semibold ml-2">
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
      className={`rounded-lg px-3 py-3 text-center flex flex-col justify-center ${
        highlight
          ? "bg-[#6cbe45]/15 border border-[#6cbe45]/30 text-[#6cbe45]"
          : "bg-[#1f1f24] border border-[#3a3a40] text-gray-300"
      }`}
    >
      <div className="text-[11px] opacity-70 mb-1">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}