"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function VerifyEmailMFAPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Send code automatically on page load (only once)
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      sendCode();
    }
  }, []);

  useEffect(() => {
    // Countdown timer
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  async function sendCode() {
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/send-mfa-code", {
        method: "POST",
      });

      const data = await response.json();

      console.log("Send MFA Code Response:", response.status, data);

      if (!response.ok) {
        throw new Error(data.error || "Error al enviar código");
      }

      setCodeSent(true);
      setTimeLeft(600); // Reset timer
    } catch (err: any) {
      console.error("Send code error:", err);
      setError(err.message);
      setCodeSent(true); // Show the form anyway so user can try manual resend
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

      if (!response.ok) {
        throw new Error(data.error || "Código incorrecto");
      }

      // Store role and redirect
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#262425] px-4">
      <form
        onSubmit={verifyCode}
        className="w-full max-w-md bg-[#2b2b30] border border-[#3a3a40] rounded-xl p-6"
      >
        <h1 className="text-white font-semibold text-lg mb-4">
          Verificación de Correo
        </h1>

        {codeSent ? (
          <>
            <p className="text-sm text-gray-400 mb-4">
              Hemos enviado un código de 6 dígitos a tu correo electrónico.
              Por favor ingrésalo a continuación.
            </p>

            <div className="mb-4">
              <input
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-3 text-center text-3xl tracking-widest font-mono"
                maxLength={6}
                autoFocus
              />
            </div>

            {timeLeft > 0 ? (
              <p className="text-xs text-gray-500 mb-4 text-center">
                Código expira en{" "}
                <span className="text-[#6cbe45] font-mono">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </span>
              </p>
            ) : (
              <p className="text-xs text-red-400 mb-4 text-center">
                El código ha expirado. Solicita uno nuevo.
              </p>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6 || timeLeft <= 0}
              className="w-full rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] disabled:opacity-60 disabled:cursor-not-allowed text-white py-2 font-semibold mb-3"
            >
              {loading ? "Verificando..." : "Verificar código"}
            </button>

            <button
              type="button"
              onClick={sendCode}
              disabled={sending || timeLeft > 540} // Can resend after 1 minute
              className="w-full text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "Enviando..." : "Reenviar código"}
            </button>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6cbe45] mx-auto mb-4"></div>
            <p className="text-gray-400">Enviando código a tu correo...</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            // Sign out and return to login
            const supabase = createSupabaseClient();
            supabase.auth.signOut();
            router.push("/auth");
          }}
          className="w-full mt-4 text-sm text-gray-400 hover:text-white"
        >
          ← Cancelar y volver
        </button>
      </form>
    </div>
  );
}
