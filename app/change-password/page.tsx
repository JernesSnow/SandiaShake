"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Sun, Moon } from "react-feather";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";

export default function ChangePasswordPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [p1, setP1]                     = useState("");
  const [p2, setP2]                     = useState("");
  const [showP1, setShowP1]             = useState(false);
  const [showP2, setShowP2]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [saving, setSaving]             = useState(false);
  const [ok, setOk]                     = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (p1.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (p1 !== p2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase.auth.updateUser({ password: p1 });
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    await supabase
      .from("usuarios")
      .update({ must_change_password: false, temp_password_hash: null })
      .eq("auth_user_id", auth.user?.id);

    setOk(true);
    setTimeout(() => router.replace("/dashboard"), 1500);
  }

  const inputCls =
    "w-full rounded-xl px-4 py-3 text-sm bg-[var(--ss-input)] text-[var(--ss-text)] " +
    "border border-[var(--ss-border)] outline-none placeholder:text-[var(--ss-text3)] " +
    "focus:border-[#6cbe45]/60 focus:ring-2 focus:ring-[#6cbe45]/20 transition";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--ss-bg)]">
      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="fixed top-4 right-4 z-50 p-2 rounded-xl bg-[var(--ss-surface)] border border-[var(--ss-border)] text-[var(--ss-text2)] hover:text-[var(--ss-text)] hover:bg-[var(--ss-raised)] transition shadow-sm"
        title={mounted ? (theme === "dark" ? "Modo claro" : "Modo oscuro") : ""}
      >
        {mounted ? (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />) : <Sun size={16} />}
      </button>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex justify-center">
            <img
              src="/mock-logo-sandia-con-chole.png"
              alt="SandiaShake"
              style={{ height: 64, width: "auto" }}
            />
          </div>

          <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-7 space-y-5">
            <div className="text-center space-y-1">
              <h1 className="text-lg font-semibold text-[var(--ss-text)]">Cambiar contraseña</h1>
              <p className="text-sm text-[var(--ss-text2)]">Ingresá y confirmá tu nueva contraseña</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)]">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showP1 ? "text" : "password"}
                    className={inputCls + " pr-11"}
                    placeholder="••••••••"
                    value={p1}
                    onChange={(e) => setP1(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowP1((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition"
                  >
                    {showP1 ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)]">Confirmar contraseña</label>
                <div className="relative">
                  <input
                    type={showP2 ? "text" : "password"}
                    className={inputCls + " pr-11"}
                    placeholder="••••••••"
                    value={p2}
                    onChange={(e) => setP2(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowP2((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition"
                  >
                    {showP2 ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-[#ee2346]/10 border border-[#ee2346]/20 px-4 py-3">
                  <p className="text-xs text-[#ee2346] text-center">{error}</p>
                </div>
              )}

              {ok && (
                <div className="rounded-xl bg-[#6cbe45]/10 border border-[#6cbe45]/20 px-4 py-3">
                  <p className="text-xs text-[#6cbe45] text-center">Contraseña actualizada. Redirigiendo…</p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving || ok}
                className="w-full rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] disabled:opacity-60 text-white py-3 text-sm font-semibold transition-all duration-150 shadow-sm"
              >
                {saving ? "Guardando…" : "Guardar contraseña"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center text-[11px] text-[var(--ss-text3)]">
        © {new Date().getFullYear()} SandíaShake · Todos los derechos reservados
      </footer>
    </div>
  );
}
