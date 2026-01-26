"use client";

import { useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function ChangePasswordPage() {
  const supabase = createSupabaseClient();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit() {
    if (p1 !== p2 || p1.length < 8) {
      setError("Las contraseñas no coinciden o son muy cortas");
      return;
    }

    await supabase.auth.updateUser({ password: p1 });

    const { data: auth } = await supabase.auth.getUser();

    await supabase
      .from("usuarios")
      .update({
        must_change_password: false,
        temp_password_hash: null,
      })
      .eq("auth_user_id", auth.user?.id);

    setOk(true);
  }

  return (
    <div className="max-w-md mx-auto mt-20 bg-[#3d3b3c] p-6 rounded-xl">
      <h1 className="text-lg font-semibold text-white mb-4">
        Cambiar contraseña
      </h1>

      <input
        type="password"
        placeholder="Nueva contraseña"
        value={p1}
        onChange={(e) => setP1(e.target.value)}
        className="w-full mb-2"
      />

      <input
        type="password"
        placeholder="Confirmar contraseña"
        value={p2}
        onChange={(e) => setP2(e.target.value)}
        className="w-full mb-4"
      />

      {error && <p className="text-red-400">{error}</p>}
      {ok && <p className="text-green-400">Contraseña actualizada</p>}

      <button onClick={submit} className="bg-[#6cbe45] px-4 py-2 rounded-md">
        Guardar
      </button>
    </div>
  );
}
