"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function InvitePage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function handleInvite() {
      const supabase = createSupabaseClient(true);

      
      const hash = window.location.hash.replace("#", "");
      const params = new URLSearchParams(hash);

      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        setError("Invitación inválida o expirada.");
        setLoading(false);
        return;
      }

     
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        setError("No se pudo validar la invitación.");
        setLoading(false);
        return;
      }

      setLoading(false);
    }

    handleInvite();
  }, []);

  async function guardarPassword(e: React.FormEvent) {
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
    const supabase = createSupabaseClient(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.replace("/dashboard");
  }

  if (loading) {
    return (
      <p className="text-white p-6">
        Validando invitación...
      </p>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#262425] px-4">
      <form
        onSubmit={guardarPassword}
        className="w-full max-w-md rounded-xl bg-[#2b2b30] p-6"
      >
        <h1 className="text-white text-lg font-semibold mb-4">
          Activar cuenta
        </h1>

        {error && (
          <p className="text-red-400 text-sm mb-3">
            {error}
          </p>
        )}

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
