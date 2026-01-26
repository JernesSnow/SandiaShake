"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock, CheckCircle, ArrowLeft } from "react-feather";
import { createSupabaseClient } from "@/lib/supabase/client";

function parseHashParams(hash: string) {
  // hash viene como "#access_token=...&refresh_token=...&type=recovery"
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(h);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    type: params.get("type"),
  };
}

export default function SetPasswordPage() {
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);


  useEffect(() => {
    async function initRecoverySession() {
      setError(null);
      setOk(null);

      try {
        const { access_token, refresh_token, type } = parseHashParams(
          window.location.hash || ""
        );

        // Si no hay tokens, puede que el usuario haya entrado directo
        if (!access_token || !refresh_token) {
          setError(
            "Este enlace no es válido o ya expiró. Vuelve a solicitar el restablecimiento."
          );
          setCargando(false);
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          setError(
            "No se pudo validar la recuperación. Vuelve a solicitar el restablecimiento."
          );
          setCargando(false);
          return;
        }

        window.history.replaceState(null, "", window.location.pathname);

        setCargando(false);
      } catch {
        setError(
          "No se pudo iniciar la recuperación. Vuelve a solicitar el restablecimiento."
        );
        setCargando(false);
      }
    }

    initRecoverySession();
  }, [supabase]);

  async function guardarNuevaPassword() {
    setError(null);
    setOk(null);

    if (!pass1 || !pass2) {
      setError("Completa ambos campos.");
      return;
    }
    if (pass1.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (pass1 !== pass2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pass1 });
      if (error) {
        setError(error.message);
        return;
      }

      setOk("Contraseña actualizada. Ya puedes iniciar sesión.");
      setPass1("");
      setPass2("");

      //cerrar sesión para forzar login limpio
      await supabase.auth.signOut();
    } catch {
      setError("No se pudo actualizar la contraseña.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#4a4748] bg-[#3d3b3c] shadow-sm">
        <div className="p-6 border-b border-[#4a4748]">
          <h1 className="text-xl font-semibold text-[#fffef9]">
            Crear nueva contraseña
          </h1>
          <p className="text-xs text-[#fffef9]/70 mt-1">
            Define una nueva contraseña para tu cuenta.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {cargando && (
            <p className="text-sm text-[#fffef9]/70">
              Validando enlace de recuperación…
            </p>
          )}

          {!cargando && (
            <>
              <div>
                <label className="text-xs text-[#fffef9]/60">
                  Nueva contraseña
                </label>
                <div className="relative mt-2">
                  <Lock
                    size={14}
                    className="absolute left-3 top-3 text-[#fffef9]/40"
                  />
                  <input
                    type="password"
                    value={pass1}
                    onChange={(e) => setPass1(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-md bg-[#1a1a1d] border border-[#4a4748] text-[#fffef9] pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ee2346]/60"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#fffef9]/60">
                  Confirmar contraseña
                </label>
                <div className="relative mt-2">
                  <Lock
                    size={14}
                    className="absolute left-3 top-3 text-[#fffef9]/40"
                  />
                  <input
                    type="password"
                    value={pass2}
                    onChange={(e) => setPass2(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full rounded-md bg-[#1a1a1d] border border-[#4a4748] text-[#fffef9] pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ee2346]/60"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400 border border-red-400/30 bg-red-500/10 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              {ok && (
                <p className="text-sm text-[#bbf7d0] border border-[#6cbe45]/30 bg-[#6cbe45]/10 rounded-md px-3 py-2 flex items-center gap-2">
                  <CheckCircle size={16} />
                  {ok}
                </p>
              )}

              <button
                disabled={guardando || !!error?.includes("enlace")}
                onClick={guardarNuevaPassword}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-[#1a1a1d] px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {guardando ? "Guardando…" : "Guardar contraseña"}
              </button>

              <div className="flex items-center justify-between">
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center gap-2 text-xs text-[#fffef9]/70 hover:text-[#fffef9]"
                >
                  <ArrowLeft size={14} />
                  Pedir otro enlace
                </Link>

                <Link
                  href="/login"
                  className="text-xs text-[#fffef9]/70 hover:text-[#fffef9]"
                >
                  Ir a login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
