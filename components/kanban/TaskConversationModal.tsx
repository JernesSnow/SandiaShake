// components/kanban/TaskConversationModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Send } from "react-feather";
import { kanbanStyles } from "./kanbanStyles";

type CommentRow = {
  id_comentario: number;
  id_tarea: number;
  id_usuario: number;
  tipo_autor: "CLIENTE" | "COLABORADOR";
  comentario: string;
  created_at: string;
  autor_nombre: string;
};

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

type Props = {
  taskId: string | number;
  taskTitle?: string;
  onClose: () => void;
};

export default function TaskConversationModal({
  taskId,
  taskTitle,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const taskIdStr = String(taskId);

  const emptyText = useMemo(
    () => rows.length === 0 && !loading && !err,
    [rows.length, loading, err]
  );

  async function markAsRead() {
    // ✅ Backend: PUT /api/admin/tareas/[id]/comentarios/lectura
    // (Antes estaba en POST; lo alineamos con tu route actual)
    try {
      await fetch(`/api/admin/tareas/${taskIdStr}/comentarios/lectura`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // no es requerido, pero no molesta
      });
    } catch {
      // No bloquea UI
    }
  }

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch(
        `/api/admin/tareas/${taskIdStr}/comentarios`,
        { cache: "no-store" }
      );
      const json = await safeJson(res);
      if (!res.ok)
        throw new Error(json?.error ?? "No se pudieron cargar los comentarios");

      const list = Array.isArray(json?.data) ? json.data : [];
      setRows(list);

      // ✅ Marcar como leído al abrir conversación (sin bloquear UI)
      markAsRead();
    } catch (e: any) {
      setErr(e?.message ?? "Error al cargar conversación");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskIdStr]);

  async function sendMessage() {
    const text = msg.trim();
    if (!text) return;

    setSending(true);
    setErr("");

    try {
      const res = await fetch(`/api/admin/tareas/${taskIdStr}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comentario: text }),
      });

      const json = await safeJson(res);
      if (!res.ok)
        throw new Error(json?.error ?? "No se pudo enviar el comentario");

      // ✅ Optimista: agrega el nuevo mensaje al final
      if (json?.data) setRows((prev) => [...prev, json.data]);
      setMsg("");

      // ✅ Lo recién enviado también queda como leído (sin bloquear UI)
      markAsRead();
    } catch (e: any) {
      setErr(e?.message ?? "Error al enviar mensaje");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={kanbanStyles.modalOverlay}>
      <div className={kanbanStyles.modalContainer}>
        <div className={kanbanStyles.modalHeader}>
          <div className="flex flex-col">
            <h2 className={kanbanStyles.modalTitle}>Conversación</h2>
            {taskTitle ? (
              <p className="text-[12px] text-[#fffef9]/60 mt-1 line-clamp-1">
                {taskTitle}
              </p>
            ) : null}
          </div>

          <button
            className={kanbanStyles.modalClose}
            onClick={onClose}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <X size={16} /> Cerrar
            </span>
          </button>
        </div>

        <div className="px-4 pb-4">
          {loading ? (
            <div className="text-sm text-[#fffef9]/60 mt-2">
              Cargando conversación…
            </div>
          ) : err ? (
            <div className="text-sm text-[#ffb3c2] mt-2">{err}</div>
          ) : emptyText ? (
            <div className="text-sm text-[#fffef9]/60 mt-2">
              no existe un historial de conversación
            </div>
          ) : (
            <div className="mt-3 max-h-[52vh] overflow-auto rounded-xl border border-white/10 bg-white/5 p-3">
              {rows.map((r) => (
                <div key={r.id_comentario} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-[#fffef9]/80">
                      <b>{r.autor_nombre}</b>{" "}
                      <span className="text-[#fffef9]/50">
                        • {r.tipo_autor}
                      </span>
                    </span>
                    <span className="text-[11px] text-[#fffef9]/40">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-[#fffef9]/90 mt-1 whitespace-pre-wrap">
                    {r.comentario}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <textarea
              className={kanbanStyles.modalTextarea}
              placeholder="Escribe un comentario…"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={2}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || !msg.trim()}
              className={kanbanStyles.modalPrimaryBtn}
              style={{ height: "fit-content" }}
            >
              <span className="inline-flex items-center gap-2">
                <Send size={14} />
                {sending ? "Enviando…" : "Enviar"}
              </span>
            </button>
          </div>

          <div className="mt-2">
            <button
              type="button"
              onClick={load}
              className={kanbanStyles.modalSecondaryBtn}
              disabled={loading}
            >
              Recargar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}