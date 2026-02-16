"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link as LinkIcon, Loader } from "react-feather";
import DriveStatusBadge from "@/components/drive/DriveStatusBadge";

type Props = {
  isAdmin?: boolean;
};

export default function GoogleDriveSection({ isAdmin = false }: Props) {
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    // Check query params for post-OAuth redirect
    const driveParam = searchParams.get("drive");
    if (driveParam === "connected") {
      setToast("Google Drive conectado exitosamente");
      setTimeout(() => setToast(null), 4000);
    } else if (driveParam === "error") {
      const reason = searchParams.get("reason") ?? "desconocido";
      setToast(`Error al conectar Google Drive: ${reason}`);
      setTimeout(() => setToast(null), 6000);
    }
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/google-drive/status", {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          setConnected(json.connected);
          setGoogleEmail(json.google_email ?? "");
          setError(json.error ?? null);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/google-drive/connect");
      if (res.ok) {
        const json = await res.json();
        if (json.url) {
          window.location.href = json.url;
          return; // Don't reset connecting — we're navigating away
        }
      } else {
        const json = await res.json().catch(() => null);
        setToast(json?.error ?? "Error al iniciar conexión");
        setTimeout(() => setToast(null), 4000);
      }
    } catch {
      setToast("Error al iniciar conexión");
      setTimeout(() => setToast(null), 4000);
    }
    setConnecting(false);
  }

  async function handleDisconnect() {
    if (!confirm("¿Estás seguro de que deseas desconectar Google Drive? Los archivos permanecerán en Drive.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const res = await fetch("/api/google-drive/disconnect", {
        method: "POST",
      });
      if (res.ok) {
        setConnected(false);
        setGoogleEmail("");
        setToast("Google Drive desconectado");
        setTimeout(() => setToast(null), 4000);
      } else {
        const json = await res.json().catch(() => null);
        setToast(json?.error ?? "Error al desconectar");
        setTimeout(() => setToast(null), 4000);
      }
    } catch {
      setToast("Error al desconectar");
      setTimeout(() => setToast(null), 4000);
    }
    setDisconnecting(false);
  }

  return (
    <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <LinkIcon size={18} className="text-[#7dd3fc]" />
          Google Drive
        </h2>

        {/* Toast */}
        {toast && (
          <div className="mb-4 rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] px-4 py-2 text-xs text-white">
            {toast}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader size={14} className="animate-spin" />
            Verificando conexión…
          </div>
        ) : connected ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4 space-y-3">
              <DriveStatusBadge connected={true} error={error} />

              <div className="grid gap-2 text-sm">
                {googleEmail && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="text-gray-500 text-xs w-32">Cuenta Google:</span>
                    <span className="text-xs text-[#7dd3fc] truncate">
                      {googleEmail}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-gray-500 mt-2">
                Los archivos se almacenan automáticamente en Google Drive.
                Se crean carpetas por organización y por tarea.
              </p>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="mt-3 text-xs text-red-400 hover:text-red-300 disabled:opacity-50 flex items-center gap-1"
                >
                  {disconnecting ? (
                    <Loader size={12} className="animate-spin" />
                  ) : null}
                  Desconectar Google Drive
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
            <DriveStatusBadge connected={false} />
            <p className="text-xs text-gray-400 mt-2 mb-4">
              Google Drive no está conectado. Conecta tu cuenta de Google para
              almacenar archivos de tareas directamente en tu Drive.
            </p>

            {isAdmin && (
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="px-4 py-2 rounded-lg bg-[#ee2346] text-white text-sm font-medium hover:bg-[#ee2346]/80 disabled:opacity-50 flex items-center gap-2"
              >
                {connecting ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <LinkIcon size={14} />
                )}
                Conectar Google Drive
              </button>
            )}

            {!isAdmin && (
              <p className="text-[11px] text-gray-500">
                Contacta al administrador para conectar Google Drive.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
