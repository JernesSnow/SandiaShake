"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Eye, EyeOff, Sun, Moon } from "react-feather";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";

export default function AuthPage() {
  const router = useRouter();

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      const { data: sesion } = await supabase.auth.getSession();
      console.log("SESSION:", sesion?.session ? "OK" : "NO", sesion);

      if (signInError) {
        if (signInError.message.includes("Email not confirmed")) {
          setError("Por favor confirmá tu correo antes de iniciar sesión.");
          return;
        }
        setError(signInError.message);
        return;
      }

      const authUserId = data.user?.id;
      if (!authUserId) { setError("No se pudo validar el usuario."); return; }

      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios")
        .select("rol, estado")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (perfilError) { setError(perfilError.message); return; }
      if (!perfil)     { setError("Tu perfil no está configurado en el sistema."); return; }
      if (perfil.estado !== "ACTIVO") { setError("Tu usuario está inactivo o bloqueado."); return; }

      // Check if MFA was already verified within the last 24 hours
      const mfaCheck = await fetch("/api/auth/check-mfa-session");
      const mfaData = await mfaCheck.json();
      if (mfaData.verified) {
        localStorage.setItem("rol", perfil.rol);
        router.push("/dashboard");
      } else {
        router.push("/verify-email-mfa");
      }
    } catch (err: any) {
      setError(err?.message ?? "Ocurrió un error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
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

          {/* Logo */}
          <div className="flex justify-center">
            <img
              src="/mock-logo-sandia-con-chole.png"
              alt="SandiaShake"
              style={{ height: 64, width: "auto" }}
            />
          </div>

          {/* Card */}
          <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-7 space-y-5">
            <div className="text-center space-y-1">
              <h1 className="text-lg font-semibold text-[var(--ss-text)]">Bienvenido de vuelta</h1>
              <p className="text-sm text-[var(--ss-text2)]">Iniciá sesión en tu cuenta</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)]">Correo electrónico</label>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[var(--ss-text2)]">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => router.push("/forgot-password")}
                    className="text-[11px] text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={inputCls + " pr-11"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-[#ee2346]/10 border border-[#ee2346]/20 px-4 py-3">
                  <p className="text-xs text-[#ee2346] text-center">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] disabled:opacity-60 text-white py-3 text-sm font-semibold transition-all duration-150 shadow-sm"
              >
                {loading ? "Entrando…" : "Entrar"}
              </button>
            </form>

            <p className="text-center text-xs text-[var(--ss-text3)]">
              ¿Nuevo en SandíaShake?{" "}
              <a href="/signup" className="font-medium text-[var(--ss-text2)] hover:text-[var(--ss-text)] underline underline-offset-2 transition">
                Crear cuenta
              </a>
            </p>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center text-[11px] text-[var(--ss-text3)]">
        © {new Date().getFullYear()} SandíaShake · Todos los derechos reservados
      </footer>
    </div>
  );
}
