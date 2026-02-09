"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createSupabaseClient(true);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setError("Sesión inválida. Abre nuevamente el enlace del correo.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.replace("/auth");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#262425] px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-[#2b2b30] p-6 rounded-xl">
        <h1 className="text-white text-lg font-semibold mb-4">
          Define tu contraseña
        </h1>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <input
          type="password"
          placeholder="Nueva contraseña"
          className="w-full mb-3 px-3 py-2 bg-[#1a1a1d] text-white rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirmar contraseña"
          className="w-full mb-4 px-3 py-2 bg-[#1a1a1d] text-white rounded"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button
          disabled={saving}
          className="w-full bg-[#6cbe45] py-2 rounded text-white disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
