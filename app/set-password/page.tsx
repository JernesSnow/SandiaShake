"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setLoading(true);
    try {
      const supabase = createSupabaseClient(true);

      //Ya hay sesión porque llega desde el callback (exchangeCodeForSession)
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) {
        setError("Sesión inválida. Vuelve a abrir el enlace del correo.");
        return;
      }

      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) {
        setError(updErr.message);
        return;
      }

      //redirigir a login o dashboard
      const next = sp.get("next") ?? "/dashboard";
      router.replace(next);
    } catch (e: any) {
      setError(e?.message ?? "Error guardando contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#262425] px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-[#2b2b30] border border-[#3a3a40] rounded-xl p-6">
        <h1 className="text-white font-semibold text-lg mb-4">Define tu contraseña</h1>

        <label className="text-sm text-gray-400">Nueva contraseña</label>
        <input
          className="w-full mt-2 mb-4 rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label className="text-sm text-gray-400">Confirmar contraseña</label>
        <input
          className="w-full mt-2 mb-4 rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] disabled:opacity-60 text-white py-2 font-semibold"
        >
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
