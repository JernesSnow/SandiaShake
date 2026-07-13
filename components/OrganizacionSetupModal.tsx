"use client";

import { useState } from "react";

type Props = {
  userEmail?: string;
};

export default function OrganizacionSetupModal({ userEmail }: Props) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pais, setPais] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [canton, setCanton] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [actividadEconomica, setActividadEconomica] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!userEmail) {
      setError("No se pudo determinar tu correo. Recarga la página e intenta de nuevo.");
      return;
    }
    if (!nombre.trim()) { setError("El nombre de la organización es obligatorio"); return; }
    if (!telefono.trim()) { setError("El teléfono es obligatorio"); return; }
    if (!pais.trim()) { setError("El país es obligatorio"); return; }
    if (!ciudad.trim()) { setError("La ciudad es obligatoria"); return; }
    if (!canton.trim()) { setError("El cantón es obligatorio"); return; }
    if (!descripcion.trim()) { setError("La descripción es obligatoria"); return; }
    if (!actividadEconomica.trim()) { setError("La actividad económica (TRIBU-CR) es obligatoria"); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/organizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          pais: pais.trim(),
          ciudad: ciudad.trim(),
          canton: canton.trim(),
          descripcion: descripcion.trim(),
          actividad_economica: actividadEconomica.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al crear la organización");
        setLoading(false);
        return;
      }

      // Reload so Shell re-checks and the modal disappears
      window.location.reload();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#6cbe45] focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl bg-[#333132] border border-[#4a4748]/40 shadow-lg">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-[#4a4748]/30">
          <h3 className="text-white font-semibold text-lg">
            Configura tu organización
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Para continuar, necesitas crear tu organización.
          </p>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Nombre — required */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-1 block">
              Nombre de la organización <span className="text-[#ee2346]">*</span>
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Mi Empresa S.A."
              className={inputClass}
              required
            />
          </div>

          {/* Correo (solo lectura) */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-1 block">
              Correo
            </label>
            <div className="flex items-center gap-2 rounded-md border border-[#3a3a40] bg-[#232326] text-gray-300 px-3 py-2 text-sm">
              <span className="flex-1 min-w-0 break-all">{userEmail || "—"}</span>
              <span className="shrink-0 text-[10px] text-gray-500 bg-[#1a1a1d] px-2 py-0.5 rounded-full">Solo lectura</span>
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-1 block">
              Teléfono <span className="text-[#ee2346]">*</span>
            </label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+506 8888-8888"
              className={inputClass}
              required
            />
          </div>

          {/* País + Ciudad + Cantón */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-gray-400 mb-1 block">
                País <span className="text-[#ee2346]">*</span>
              </label>
              <input
                value={pais}
                onChange={(e) => setPais(e.target.value)}
                placeholder="Costa Rica"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400 mb-1 block">
                Ciudad <span className="text-[#ee2346]">*</span>
              </label>
              <input
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="San José"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400 mb-1 block">
                Cantón <span className="text-[#ee2346]">*</span>
              </label>
              <input
                value={canton}
                onChange={(e) => setCanton(e.target.value)}
                placeholder="Escazú"
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Actividad Económica (TRIBU-CR) */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-1 block">
              Actividad Económica (TRIBU-CR) <span className="text-[#ee2346]">*</span>
            </label>
            <input
              value={actividadEconomica}
              onChange={(e) => setActividadEconomica(e.target.value)}
              placeholder="Ej: 620100 - Actividades de programación informática"
              className={inputClass}
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-1 block">
              Descripción <span className="text-[#ee2346]">*</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Breve descripción de tu organización..."
              rows={3}
              className={inputClass + " resize-none"}
              required
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-[#ee2346] bg-[#ee2346]/10 border border-[#ee2346]/30 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <div className="flex justify-end pt-2 border-t border-[#4a4748]/30">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-[#6cbe45] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creando..." : "Crear organización"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
