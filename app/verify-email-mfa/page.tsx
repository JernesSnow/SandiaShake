"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { Sun, Moon } from "react-feather";
import { useTheme } from "next-themes";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function VerifyEmailMFAPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [code, setCode]         = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [sending, setSending]   = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const hasInitialized          = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      sendCode();
    }
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  async function sendCode() {
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/send-mfa-code", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al enviar código");
      setCodeSent(true);
      setTimeLeft(600);
    } catch (err: any) {
      setError(err.message);
      setCodeSent(true);
    } finally {
      setSending(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/verify-mfa-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Código incorrecto");
      localStorage.setItem("rol", data.rol);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = (timeLeft / 600) * 100;

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
            <img src="/mock-logo-sandia-con-chole.png" alt="SandiaShake" style={{ height: 40, width: "auto" }} />
          </div>

          {/* Card */}
          <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-7 space-y-5">
            <div className="text-center space-y-1">
              <h1 className="text-lg font-semibold text-[var(--ss-text)]">Verificación de correo</h1>
              <p className="text-sm text-[var(--ss-text2)]">
                Ingresá el código de 6 dígitos que enviamos a tu correo.
              </p>
            </div>

            {!codeSent ? (
              /* Sending state */
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-10 h-10 rounded-full border-2 border-[#6cbe45] border-t-transparent animate-spin" />
                <p className="text-sm text-[var(--ss-text2)]">Enviando código…</p>
              </div>
            ) : (
              <form onSubmit={verifyCode} className="space-y-4">
                {/* Code input */}
                <div className="space-y-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    maxLength={6}
                    autoFocus
                    className="w-full rounded-xl bg-[var(--ss-input)] border border-[var(--ss-border)] text-[var(--ss-text)] text-center text-3xl font-mono tracking-[0.4em] py-4 outline-none focus:border-[#6cbe45]/60 focus:ring-2 focus:ring-[#6cbe45]/20 transition placeholder:text-[var(--ss-text3)] placeholder:tracking-widest"
                  />
                </div>

                {/* Timer */}
                <div className="space-y-2">
                  <div className="h-1 w-full rounded-full bg-[var(--ss-raised)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-linear"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: timeLeft > 120 ? "#6cbe45" : timeLeft > 30 ? "#f1c232" : "#ee2346",
                      }}
                    />
                  </div>
                  {timeLeft > 0 ? (
                    <p className="text-xs text-center text-[var(--ss-text3)]">
                      Expira en{" "}
                      <span className="font-mono font-semibold text-[var(--ss-text2)]">
                        {minutes}:{seconds.toString().padStart(2, "0")}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-center text-[#ee2346]">El código expiró. Solicitá uno nuevo.</p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-xl bg-[#ee2346]/10 border border-[#ee2346]/20 px-4 py-3">
                    <p className="text-xs text-[#ee2346] text-center">{error}</p>
                  </div>
                )}

                {/* Verify */}
                <button
                  type="submit"
                  disabled={loading || code.length !== 6 || timeLeft <= 0}
                  className="w-full rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 text-sm font-semibold transition-all duration-150 shadow-sm"
                >
                  {loading ? "Verificando…" : "Verificar código"}
                </button>

                {/* Resend */}
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={sending || timeLeft > 540}
                  className="w-full text-xs text-[var(--ss-text3)] hover:text-[var(--ss-text)] disabled:opacity-40 disabled:cursor-not-allowed transition py-1"
                >
                  {sending ? "Enviando…" : "Reenviar código"}
                </button>
              </form>
            )}

            {/* Cancel */}
            <div className="pt-1 border-t border-[var(--ss-border)]">
              <button
                type="button"
                onClick={async () => {
                  const supabase = createSupabaseClient();
                  await supabase.auth.signOut();
                  router.push("/auth");
                }}
                className="w-full text-xs text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition py-1"
              >
                ← Cancelar y volver al inicio
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
