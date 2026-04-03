"use client";

import { useEffect, useState } from "react";
import { Gift, Plus, Edit2, Trash2, X } from "react-feather";

type Premio = {
  id_premio: number;
  nombre: string;
  descripcion: string;
  puntos_costo: number;
  visible: boolean;
};

const inputCls =
  "w-full rounded-xl px-3 py-2.5 text-sm bg-[var(--ss-input)] text-[var(--ss-text)] " +
  "border border-[var(--ss-border)] outline-none " +
  "focus:ring-2 focus:ring-[#6cbe45]/25 focus:border-[#6cbe45]/60 transition";

export default function RewardsSection() {
  const [premios, setPremios] = useState<Premio[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Premio | null>(null);
  const [isNew, setIsNew]     = useState(false);
  const [form, setForm]       = useState({ nombre: "", descripcion: "", puntos_costo: 0 });

  async function loadPremios() {
    setLoading(true);
    const res  = await fetch("/api/admin/premios", { credentials: "include" });
    const json = await res.json();
    if (res.ok) setPremios(json.premios ?? []);
    setLoading(false);
  }

  useEffect(() => { loadPremios(); }, []);

  async function createPremio() {
    const res = await fetch("/api/admin/premios", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) { const j = await res.json(); alert(j.error); return; }
    await loadPremios(); closeModal();
  }

  async function updatePremio() {
    const res = await fetch("/api/admin/premios", {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_premio: editing?.id_premio, ...form }),
    });
    if (!res.ok) { const j = await res.json(); alert(j.error); return; }
    await loadPremios(); closeModal();
  }

  async function deletePremio(id: number) {
    if (!confirm("¿Eliminar premio?")) return;
    const res = await fetch(`/api/admin/premios?id_premio=${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) { const j = await res.json(); alert(j.error); return; }
    loadPremios();
  }

  async function toggleVisible(p: Premio) {
    const res = await fetch("/api/admin/premios", {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_premio: p.id_premio, visible: !p.visible }),
    });
    if (!res.ok) { const j = await res.json(); alert(j.error); return; }
    loadPremios();
  }

  function openCreate() {
    setIsNew(true); setEditing(null);
    setForm({ nombre: "", descripcion: "", puntos_costo: 0 });
  }

  function openEdit(p: Premio) {
    setIsNew(false); setEditing(p);
    setForm({ nombre: p.nombre, descripcion: p.descripcion ?? "", puntos_costo: p.puntos_costo });
  }

  function closeModal() { setEditing(null); setIsNew(false); }

  return (
    <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-6 mb-5">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-[var(--ss-text)] flex items-center gap-2">
          <Gift size={16} className="text-[#fbbf24]" /> Catálogo de Premios
        </h2>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#ee2346] hover:bg-[#d8203f] px-3 py-2 text-sm font-semibold text-white transition"
        >
          <Plus size={15} /> Nuevo premio
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--ss-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--ss-raised)] border-b border-[var(--ss-border)]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--ss-text2)]">Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--ss-text2)]">Descripción</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--ss-text2)]">Costo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--ss-text2)]">Visibilidad</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[var(--ss-text2)]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--ss-text3)]">Cargando…</td>
              </tr>
            ) : premios.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--ss-text3)]">No hay premios registrados.</td>
              </tr>
            ) : premios.map((p) => (
              <tr key={p.id_premio} className="border-t border-[var(--ss-border)] hover:bg-[var(--ss-overlay)] transition">
                <td className="px-4 py-3 text-[var(--ss-text)] font-medium">{p.nombre}</td>
                <td className="px-4 py-3 text-[var(--ss-text2)] max-w-[200px] truncate">{p.descripcion}</td>
                <td className="px-4 py-3">
                  <span className="text-[#fbbf24] font-semibold">{p.puntos_costo}</span>
                  <span className="text-[var(--ss-text3)] text-xs ml-1">pts</span>
                </td>
                <td className="px-4 py-3">
                  {p.visible ? (
                    <span className="inline-flex px-2 py-0.5 text-[11px] rounded-full bg-[#6cbe45]/15 text-[#6cbe45] border border-[#6cbe45]/30 font-medium">Visible</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 text-[11px] rounded-full bg-[var(--ss-raised)] text-[var(--ss-text3)] border border-[var(--ss-border)] font-medium">Oculto</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => toggleVisible(p)}
                      className="rounded-lg border border-[var(--ss-border)] px-2.5 py-1 text-[12px] text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] transition"
                    >
                      {p.visible ? "Ocultar" : "Mostrar"}
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="rounded-lg border border-[var(--ss-border)] px-2.5 py-1 text-[12px] text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] transition flex items-center gap-1"
                    >
                      <Edit2 size={12} /> Editar
                    </button>
                    <button
                      onClick={() => deletePremio(p.id_premio)}
                      className="rounded-lg border border-[#ee2346]/30 bg-[#ee2346]/10 px-2.5 py-1 text-[12px] text-[#ee2346] hover:bg-[#ee2346]/20 transition flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {(editing || isNew) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-2xl overflow-hidden">

            <div className="px-5 py-4 border-b border-[var(--ss-border)] flex items-center justify-between">
              <h3 className="font-semibold text-[var(--ss-text)] flex items-center gap-2">
                <Gift size={16} className="text-[#fbbf24]" />
                {isNew ? "Crear nuevo premio" : "Editar premio"}
              </h3>
              <button onClick={closeModal} className="text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition p-1 rounded-lg hover:bg-[var(--ss-overlay)]">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">Nombre del premio</label>
                <input
                  placeholder="Ej: Gift Card Amazon"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">Descripción</label>
                <textarea
                  rows={3}
                  placeholder="Describe el premio..."
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  className={inputCls + " resize-none"}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">Costo en Chilli Points</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Ej: 500"
                    value={form.puntos_costo}
                    onChange={e => setForm({ ...form, puntos_costo: Number(e.target.value) })}
                    className={inputCls}
                  />
                  <span className="text-[#fbbf24] font-semibold text-sm shrink-0">pts</span>
                </div>
                <p className="text-[11px] text-[var(--ss-text3)]">
                  Cantidad de Chilli Points necesarios para canjear este premio.
                </p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[var(--ss-border)] flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded-xl border border-[var(--ss-border)] px-4 py-2 text-sm text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] transition"
              >
                Cancelar
              </button>
              <button
                onClick={isNew ? createPremio : updatePremio}
                className="rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] px-5 py-2 text-sm font-semibold text-white transition"
              >
                Guardar premio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
