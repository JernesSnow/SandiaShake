"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link as LinkIcon, Loader, CheckCircle } from "react-feather";
import DriveStatusBadge from "@/components/drive/DriveStatusBadge";

type Props = { isAdmin?: boolean };

export default function GoogleDriveSection({ isAdmin = false }: Props) {
  const searchParams = useSearchParams();
  const [connected, setConnected]     = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [connecting, setConnecting]   = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast]             = useState<string | null>(null);

  useEffect(() => {
    const p = searchParams.get("drive");
    if (p === "connected") {
      setToast("Google Drive conectado exitosamente");
      setTimeout(() => setToast(null), 4000);
    } else if (p === "error") {
      setToast(`Error al conectar: ${searchParams.get("reason") ?? "desconocido"}`);
      setTimeout(() => setToast(null), 6000);
    }
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/google-drive/status", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setConnected(json.connected); setGoogleEmail(json.google_email ?? ""); setError(json.error ?? null);
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/google-drive/connect");
      if (res.ok) {
        const json = await res.json();
        if (json.url) { window.location.href = json.url; return; }
      }
      setToast("Error al iniciar conexión"); setTimeout(() => setToast(null), 4000);
    } catch { setToast("Error al iniciar conexión"); setTimeout(() => setToast(null), 4000); }
    setConnecting(false);
  }

  async function handleDisconnect() {
    if (!confirm("¿Desconectar Google Drive? Los archivos permanecerán en Drive.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/google-drive/disconnect", { method: "POST" });
      if (res.ok) { setConnected(false); setGoogleEmail(""); setToast("Google Drive desconectado"); setTimeout(() => setToast(null), 4000); }
      else { setToast("Error al desconectar"); setTimeout(() => setToast(null), 4000); }
    } catch { setToast("Error al desconectar"); setTimeout(() => setToast(null), 4000); }
    setDisconnecting(false);
  }

  return (
    <div className="rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm p-6 mb-5">
      <h2 className="text-base font-semibold text-[var(--ss-text)] mb-4 flex items-center gap-2">
        <LinkIcon size={16} className="text-[#7dd3fc]" /> Google Drive
      </h2>

      {toast && (
        <div className="mb-4 rounded-xl bg-[var(--ss-raised)] border border-[var(--ss-border)] px-4 py-2.5 text-xs text-[var(--ss-text2)]">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--ss-text3)]">
          <Loader size={14} className="animate-spin" /> Verificando conexión…
        </div>
      ) : connected ? (
        <div className="rounded-xl bg-[#6cbe45]/10 border border-[#6cbe45]/25 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-[#6cbe45]" />
            <span className="text-sm font-semibold text-[#6cbe45]">Google Drive conectado</span>
          </div>
          {googleEmail && (
            <p className="text-xs text-[var(--ss-text2)]">
              Cuenta: <span className="text-[#7dd3fc] font-medium">{googleEmail}</span>
            </p>
          )}
          <p className="text-[11px] text-[var(--ss-text3)]">
            Los archivos se almacenan automáticamente en Google Drive.
          </p>
          {isAdmin && (
            <button type="button" onClick={handleDisconnect} disabled={disconnecting} className="flex items-center gap-1.5 text-xs text-[#ee2346] hover:text-[#d8203f] disabled:opacity-50 transition">
              {disconnecting && <Loader size={12} className="animate-spin" />}
              Desconectar Google Drive
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-[var(--ss-raised)] border border-[var(--ss-border)] p-4 space-y-3">
          <DriveStatusBadge connected={false} />
          <p className="text-xs text-[var(--ss-text3)]">
            Google Drive no está conectado. Conectá tu cuenta de Google para almacenar archivos de tareas directamente en tu Drive.
          </p>
          {isAdmin ? (
            <button type="button" onClick={handleConnect} disabled={connecting} className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm transition disabled:opacity-50">
              {connecting ? <Loader size={14} className="animate-spin" /> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Conectar Google Drive
            </button>
          ) : (
            <p className="text-[11px] text-[var(--ss-text3)]">Contactá al administrador para conectar Google Drive.</p>
          )}
        </div>
      )}
    </div>
  );
}
