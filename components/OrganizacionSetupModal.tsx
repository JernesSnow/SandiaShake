"use client";

import { useState } from "react";

type Props = {
  userEmail?: string;
};

export default function OrganizacionSetupModal({ userEmail }: Props) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState(userEmail ?? "");
  const [telefono, setTelefono] = useState("");
  const [pais, setPais] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [canton, setCanton] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre de la organización es obligatorio");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/organizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          correo: correo.trim() || undefined,
          telefono: telefono.trim() || undefined,
          pais: pais.trim() || undefined,
          ciudad: ciudad.trim() || undefined,
          canton: canton.trim() || undefined,
          descripcion: descripcion.trim() || undefined,
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

          {/* Correo + Teléfono */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-400 mb-1 block">
                Correo
              </label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="org@ejemplo.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400 mb-1 block">
                Teléfono
              </label>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+506 8888-8888"
                className={inputClass}
              />
            </div>
          </div>

          {/* País + Ciudad + Cantón */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-gray-400 mb-1 block">
                País
              </label>
              <input
                value={pais}
                onChange={(e) => setPais(e.target.value)}
                placeholder="Costa Rica"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400 mb-1 block">
                Ciudad
              </label>
              <input
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="San José"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400 mb-1 block">
                Cantón
              </label>
              <input
                value={canton}
                onChange={(e) => setCanton(e.target.value)}
                placeholder="Escazú"
                className={inputClass}
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-1 block">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Breve descripción de tu organización..."
              rows={3}
              className={inputClass + " resize-none"}
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
