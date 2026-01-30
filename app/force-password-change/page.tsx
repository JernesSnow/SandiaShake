"use client";

import { useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function ForcePasswordChangePage() {
  const supabase = createSupabaseClient();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    setError(null);

    if (p1.length < 8) {
      setError("Mínimo 8 caracteres.");
      return;
    }
    if (p1 !== p2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    // Cambiar password en auth 
    const { error: authError } =
      await supabase.auth.updateUser({ password: p1 });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/finalize-password-change", {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      setError("Error finalizando el cambio de contraseña");
      setLoading(false);
      return;
    }

    //Login
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#262425]">
      <div className="bg-[#2b2b30] p-6 rounded-xl w-full max-w-md">
        <h1 className="text-lg font-semibold text-white mb-4">
          Cambia tu contraseña
        </h1>

        <input
          type="password"
          placeholder="Nueva contraseña"
          value={p1}
          onChange={(e) => setP1(e.target.value)}
          className="w-full mb-3 px-3 py-2 bg-[#1a1a1d] text-white rounded-md"
        />

        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={p2}
          onChange={(e) => setP2(e.target.value)}
          className="w-full mb-3 px-3 py-2 bg-[#1a1a1d] text-white rounded-md"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          disabled={loading}
          onClick={save}
          className="w-full bg-[#6cbe45] text-black py-2 rounded-md font-semibold"
        >
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </div>
    </div>
  );
}
