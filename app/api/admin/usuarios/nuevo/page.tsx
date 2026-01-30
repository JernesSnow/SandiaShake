"use client";

import { useState } from "react";

export default function CrearUsuarioPage() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<"ADMIN" | "COLABORADOR">("COLABORADOR");
  const [nivelAdmin, setNivelAdmin] = useState<"PRIMARIO" | "SECUNDARIO">("SECUNDARIO");

  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function crearUsuario() {
    setError(null);
    setMensaje(null);
    setLoading(true);

    const res = await fetch("/api/admin/crear-usuario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        correo,
        rol,
        admin_nivel: rol === "ADMIN" ? nivelAdmin : null,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Error creando usuario");
      return;
    }

    setMensaje(json.mensaje);
    setNombre("");
    setCorreo("");
    setRol("COLABORADOR");
  }

  return (
    <div className="max-w-xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Crear usuario</h1>

      <input
        className="w-full border p-2"
        placeholder="Nombre completo"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />

      <input
        className="w-full border p-2"
        placeholder="Correo electrónico"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
      />

      <select
        className="w-full border p-2"
        value={rol}
        onChange={(e) => setRol(e.target.value as any)}
      >
        <option value="COLABORADOR">Colaborador</option>
        <option value="ADMIN">Administrador</option>
      </select>

      {rol === "ADMIN" && (
        <select
          className="w-full border p-2"
          value={nivelAdmin}
          onChange={(e) => setNivelAdmin(e.target.value as any)}
        >
          <option value="PRIMARIO">Primario</option>
          <option value="SECUNDARIO">Secundario</option>
        </select>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {mensaje && <p className="text-green-700 text-sm">{mensaje}</p>}

      <button
        disabled={loading || !nombre || !correo}
        onClick={crearUsuario}
        className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear usuario"}
      </button>
    </div>
  );
}
