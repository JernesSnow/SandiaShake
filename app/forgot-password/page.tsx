"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { CheckCircle, Sun, Moon } from "react-feather";
import { useTheme } from "next-themes";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk]           = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "No se pudo enviar el acceso temporal.");
    } else {
      setOk(true);
    }

    setLoading(false);
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

  if (ok) {
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
                <h1 className="text-lg font-semibold text-[var(--ss-text)]">¡Correo enviado!</h1>
                <p className="text-sm text-[var(--ss-text2)] leading-relaxed">
                  Enviamos un acceso temporal a{" "}
                  <span className="font-medium text-[var(--ss-text)]">{email}</span>.
                  Revisá tu bandeja de entrada.
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
              <h1 className="text-lg font-semibold text-[var(--ss-text)]">Recuperar acceso</h1>
              <p className="text-sm text-[var(--ss-text2)]">
                Ingresá tu correo y te enviamos un acceso temporal.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)]">Correo electrónico</label>
                <input
                  type="email"
                  required
                  className={inputCls}
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-[#ee2346]/10 border border-[#ee2346]/20 px-4 py-3">
                  <p className="text-xs text-[#ee2346] text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] disabled:opacity-60 text-white py-3 text-sm font-semibold transition-all duration-150 shadow-sm"
              >
                {loading ? "Enviando…" : "Enviar acceso temporal"}
              </button>
            </form>

            <div className="pt-1 border-t border-[var(--ss-border)]">
              <button
                type="button"
                onClick={() => router.push("/auth")}
                className="w-full text-xs text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition py-1"
              >
                ← Volver a iniciar sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center text-[11px] text-[var(--ss-text3)]">
        © {new Date().getFullYear()} SandíaShake · Todos los derechos reservados
      </footer>
    </div>
  );
}
