"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Eye, EyeOff, CheckCircle, Sun, Moon } from "react-feather";
import { useTheme } from "next-themes";

export default function SignUpPage() {
  const router = useRouter();

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [nombre, setNombre]                     = useState("");
  const [email, setEmail]                       = useState("");
  const [password, setPassword]                 = useState("");
  const [confirmPassword, setConfirmPassword]   = useState("");
  const [showPassword, setShowPassword]         = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [success, setSuccess]                   = useState(false);
  const [loading, setLoading]                   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!nombre || !email || !password || !confirmPassword) {
      setError("Por favor completá todos los campos");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, correo: email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al registrarse"); return; }
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? "Ocurrió un error al registrarse.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl px-4 py-3 text-sm bg-[var(--ss-input)] text-[var(--ss-text)] " +
    "border border-[var(--ss-border)] outline-none placeholder:text-[var(--ss-text3)] " +
    "focus:border-[#6cbe45]/60 focus:ring-2 focus:ring-[#6cbe45]/20 transition";

  const themeToggle = (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="fixed top-4 right-4 z-50 p-2 rounded-xl bg-[var(--ss-surface)] border border-[var(--ss-border)] text-[var(--ss-text2)] hover:text-[var(--ss-text)] hover:bg-[var(--ss-raised)] transition shadow-sm"
      title={mounted ? (theme === "dark" ? "Modo claro" : "Modo oscuro") : ""}
    >
      {mounted ? (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />) : <Sun size={16} />}
    </button>
  );

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--ss-bg)]">
        {themeToggle}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm space-y-8">
            <div className="flex justify-center">
              <img src="/mock-logo-sandia-con-chole.png" alt="SandiaShake" style={{ height: 40, width: "auto" }} />
            </div>
            <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-7 text-center space-y-5">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-[#6cbe45]/15 border border-[#6cbe45]/30 flex items-center justify-center">
                  <CheckCircle size={28} className="text-[#6cbe45]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h1 className="text-lg font-semibold text-[var(--ss-text)]">¡Registro exitoso!</h1>
                <p className="text-sm text-[var(--ss-text2)] leading-relaxed">
                  Enviamos un correo de confirmación a{" "}
                  <span className="font-medium text-[var(--ss-text)]">{email}</span>.
                  Revisá tu bandeja de entrada y hacé clic en el enlace para activar tu cuenta.
                </p>
              </div>
              <div className="rounded-xl bg-[var(--ss-raised)] border border-[var(--ss-border)] px-4 py-3">
                <p className="text-xs text-[var(--ss-text3)]">
                  Si no lo ves en tu bandeja, revisá la carpeta de spam.
                </p>
              </div>
              <button
                onClick={() => router.push("/auth")}
                className="w-full rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] text-white py-3 text-sm font-semibold transition-all duration-150 shadow-sm"
              >
                Ir a iniciar sesión
              </button>
            </div>
          </div>
        </div>
        <footer className="py-4 text-center text-[11px] text-[var(--ss-text3)]">
          © {new Date().getFullYear()} SandíaShake · Todos los derechos reservados
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--ss-bg)]">
      {themeToggle}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-8">

          {/* Logo */}
          <div className="flex justify-center">
            <img src="/mock-logo-sandia-con-chole.png" alt="SandiaShake" style={{ height: 40, width: "auto" }} />
          </div>

          {/* Card */}
          <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-7 space-y-5">
            <div className="text-center space-y-1">
              <h1 className="text-lg font-semibold text-[var(--ss-text)]">Crear cuenta</h1>
              <p className="text-sm text-[var(--ss-text2)]">Registrate para acceder a SandíaShake</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)]">Nombre completo</label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>

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
                <label className="text-xs font-medium text-[var(--ss-text2)]">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={inputCls + " pr-11"}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)]">Confirmar contraseña</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    className={inputCls + " pr-11"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
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
                {loading ? "Creando cuenta…" : "Crear cuenta"}
              </button>
            </form>

            <p className="text-center text-xs text-[var(--ss-text3)]">
              ¿Ya tenés cuenta?{" "}
              <a href="/auth" className="font-medium text-[var(--ss-text2)] hover:text-[var(--ss-text)] underline underline-offset-2 transition">
                Iniciar sesión
              </a>
            </p>

            <p className="text-center text-[10px] text-[var(--ss-text3)]">
              Al registrarte aceptás nuestros términos de servicio y política de privacidad.
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
