"use client";

import { useEffect, useState } from "react";
import { Gift, Plus, Edit2, Trash2 } from "react-feather";

type Premio = {
  id_premio: number;
  nombre: string;
  descripcion: string;
  puntos_costo: number;
  visible: boolean;
};

export default function RewardsSection() {
  const [premios, setPremios] = useState<Premio[]>([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<Premio | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    puntos_costo: 0,
  });

  /* ---------------- LOAD PREMIOS ---------------- */

  async function loadPremios() {
    setLoading(true);

    const res = await fetch("/api/admin/premios", {
      credentials: "include",
    });

    const json = await res.json();

    if (res.ok) {
      setPremios(json.premios ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPremios();
  }, []);

  /* ---------------- CREATE ---------------- */

  async function createPremio() {
    const res = await fetch("/api/admin/premios", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const j = await res.json();
      alert(j.error);
      return;
    }

    await loadPremios();
    closeModal();
  }

  /* ---------------- UPDATE ---------------- */

  async function updatePremio() {
    const res = await fetch("/api/admin/premios", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_premio: editing?.id_premio,
        ...form,
      }),
    });

    if (!res.ok) {
      const j = await res.json();
      alert(j.error);
      return;
    }

    await loadPremios();
    closeModal();
  }

  /* ---------------- DELETE ---------------- */

  async function deletePremio(id: number) {
    if (!confirm("Eliminar premio?")) return;

    const res = await fetch(`/api/admin/premios?id_premio=${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const j = await res.json();
      alert(j.error);
      return;
    }

    loadPremios();
  }

  async function toggleVisible(p: Premio) {
  const res = await fetch("/api/admin/premios", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_premio: p.id_premio,
      visible: !p.visible,
    }),
  });

  if (!res.ok) {
    const j = await res.json();
    alert(j.error);
    return;
  }

  loadPremios();
}

  /* ---------------- MODAL ---------------- */

  function openCreate() {
    setIsNew(true);
    setEditing(null);

    setForm({
      nombre: "",
      descripcion: "",
      puntos_costo: 0,
    });
  }

  function openEdit(p: Premio) {
    setIsNew(false);
    setEditing(p);

    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      puntos_costo: p.puntos_costo,
    });
  }

  function closeModal() {
    setEditing(null);
    setIsNew(false);
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
      <div className="p-6">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Gift size={18} className="text-[#fbbf24]" />
            Catálogo de Premios
          </h2>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold bg-[#ee2346] hover:bg-[#d8203f] text-white"
          >
            <Plus size={16} />
            Nuevo premio
          </button>
        </div>

        {/* TABLE */}

        <div className="overflow-x-auto rounded-lg border border-[#4a4748]/40">
          <table className="w-full text-sm">
            <thead className="bg-[#2b2b30] text-gray-300">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Descripción</th>
                <th className="text-left px-4 py-3">Costo</th>
                <th className="text-left px-4 py-3">Visible</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="bg-[#333132] text-gray-200">
              {premios.map((p) => (
                <tr key={p.id_premio} className="border-t border-[#4a4748]/30">
                  <td className="px-4 py-3">{p.nombre}</td>

                  <td className="px-4 py-3 text-gray-300">{p.descripcion}</td>

                  <td className="px-4 py-3 text-[#fbbf24] font-semibold">
                    {p.puntos_costo} pts
                  </td>

                  {/* VISIBILITY */}
                  <td className="px-4 py-3">
                    {p.visible ? (
                      <span className="px-2 py-1 text-[11px] rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                        Visible
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-[11px] rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30">
                        Oculto
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">

                      {/* SHOW / HIDE */}
                      <button
                        onClick={() => toggleVisible(p)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#4a4748]/40 px-2 py-1 text-[12px] text-gray-200 hover:bg-[#3a3738]"
                      >
                        {p.visible ? "Ocultar" : "Mostrar"}
                      </button>

                      <button
                        onClick={() => openEdit(p)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#4a4748]/40 px-2 py-1 text-[12px] text-gray-200 hover:bg-[#3a3738]"
                      >
                        <Edit2 size={14} /> Editar
                      </button>

                      <button
                        onClick={() => deletePremio(p.id_premio)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#ee2346]/40 bg-[#ee2346]/10 px-2 py-1 text-[12px] text-[#ee2346]"
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>

                    </div>
                  </td>
                </tr>
              ))}

              {!loading && premios.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    No hay premios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL */}

        {(editing || isNew) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-xl bg-[#333132] border border-[#4a4748]/40 shadow-xl">

            {/* HEADER */}
            <div className="px-6 py-4 border-b border-[#4a4748]/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Gift size={18} className="text-[#fbbf24]" />
                {isNew ? "Crear nuevo premio" : "Editar premio"}
              </div>

              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white text-sm"
              >
                Cerrar
              </button>
            </div>

            {/* BODY */}
            <div className="p-6 space-y-5">

              {/* NOMBRE */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Nombre del premio
                </label>
                <input
                  placeholder="Ej: Gift Card Amazon"
                  value={form.nombre}
                  onChange={(e) =>
                    setForm({ ...form, nombre: e.target.value })
                  }
                  className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                />
              </div>

              {/* DESCRIPCION */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe el premio..."
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                  className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
                />
              </div>

              {/* PUNTOS */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Costo en Chilli Points
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Ej: 500"
                    value={form.puntos_costo}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        puntos_costo: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#fbbf24]"
                  />

                  <span className="text-[#fbbf24] font-semibold text-sm">
                    pts
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 mt-1">
                  Cantidad de Chilli Points necesarios para canjear este premio.
                </p>
              </div>

            </div>

            {/* FOOTER */}
            <div className="px-6 py-4 border-t border-[#4a4748]/30 flex justify-end gap-3">

              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-md border border-[#4a4748]/40 text-gray-300 hover:bg-[#3a3738] text-sm"
              >
                Cancelar
              </button>

              <button
                onClick={isNew ? createPremio : updatePremio}
                className="px-5 py-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white text-sm font-semibold transition"
              >
                Guardar premio
              </button>

            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}