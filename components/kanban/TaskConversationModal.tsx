"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, CheckCircle, XCircle } from "react-feather";
import { kanbanStyles } from "./kanbanStyles";

type CommentRow = {
  id_comentario: number;
  id_tarea: number;

  id_usuario: number;
  tipo_autor: "CLIENTE" | "COLABORADOR";
  comentario: string;
  created_at: string;
  autor_nombre: string;

  visto_por_otro?: boolean;
  leido_por_count?: number;
};

type Role = "ADMIN" | "COLABORADOR" | "CLIENTE" | "DESCONOCIDO";

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
  onTaskUpdated?: (updatedTaskRow: any) => void;

  apiScope?: "admin" | "cliente";
};

export default function TaskConversationModal({
  taskId,
  taskTitle,
  onClose,
  onTaskUpdated,
  apiScope = "admin",
}: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const [perfilId, setPerfilId] = useState<number | null>(null);
  const [role, setRole] = useState<Role>("DESCONOCIDO");

  const [deciding, setDeciding] = useState<"APROBAR" | "RECHAZAR" | "">("");

  const taskIdStr = String(taskId);
  const base = apiScope === "cliente" ? "/api/cliente" : "/api/admin";
  const listRef = useRef<HTMLDivElement | null>(null);

  const emptyText = useMemo(
    () => rows.length === 0 && !loading && !err,
    [rows.length, loading, err]
  );

  const isCliente = role === "CLIENTE";

  function getDecisionMeta(text: string) {
    const t = String(text ?? "");
    if (t.startsWith("APROBADO:")) return { kind: "APROBADO" as const, label: "APROBADO" };
    if (t.startsWith("RECHAZADO:")) return { kind: "RECHAZADO" as const, label: "RECHAZADO" };
    return null;
  }

  async function loadPerfil() {
    try {
      const res = await fetch(`${base}/usuarios`, { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) return;

      const pid = Number(json?.perfil?.id_usuario);
      const rolRaw = String(json?.perfil?.rol ?? "").toUpperCase();

      if (Number.isFinite(pid) && pid > 0) setPerfilId(pid);

      if (rolRaw === "ADMIN") setRole("ADMIN");
      else if (rolRaw === "COLABORADOR") setRole("COLABORADOR");
      else if (rolRaw === "CLIENTE") setRole("CLIENTE");
      else setRole("DESCONOCIDO");
    } catch {
    }
  }

  async function markAsRead() {
    try {
      await fetch(`${base}/tareas/${taskIdStr}/comentarios/lectura`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
    }
  }

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch(`${base}/tareas/${taskIdStr}/comentarios`, {
        cache: "no-store",
      });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar los comentarios");

      const list = Array.isArray(json?.data) ? (json.data as CommentRow[]) : [];
      setRows(list);

      markAsRead();
    } catch (e: any) {
      setErr(e?.message ?? "Error al cargar conversación");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [rows.length]);

  useEffect(() => {
    loadPerfil();
    load();
  }, [taskIdStr, base]);

  async function sendMessage() {
    const text = msg.trim();
    if (!text) return;

    setSending(true);
    setErr("");

    try {
      const res = await fetch(`${base}/tareas/${taskIdStr}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comentario: text }),
      });

      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo enviar el comentario");

      if (json?.data) setRows((prev) => [...prev, json.data]);
      setMsg("");

      markAsRead();
      await load(); 
    } catch (e: any) {
      setErr(e?.message ?? "Error al enviar mensaje");
    } finally {
      setSending(false);
    }
  }

  async function decide(accion: "APROBAR" | "RECHAZAR") {
    const comentario = msg.trim();
    if (!comentario) {
      setErr("Debes escribir un comentario antes de aprobar o rechazar.");
      return;
    }

    setDeciding(accion);
    setErr("");

    try {
      const res = await fetch(`/api/admin/tareas/${taskIdStr}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, comentario }),
      });

      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo registrar la decisión");
      setMsg("");
      await load();

      if (json?.data && onTaskUpdated) onTaskUpdated(json.data);
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo registrar la decisión");
    } finally {
      setDeciding("");
    }
  }

  function renderTicks(r: CommentRow) {
    if (!perfilId || Number(r.id_usuario) !== Number(perfilId)) return null;

    const seen = Boolean(r.visto_por_otro);
    return (
      <span
        className="ml-2 text-[11px] text-[#fffef9]/50 select-none"
        title={seen ? "Visto" : "Enviado"}
      >
        {seen ? "✓✓" : "✓"}
      </span>
    );
  }

  function MessageBubble({ r }: { r: CommentRow }) {
    const mine = perfilId && Number(r.id_usuario) === Number(perfilId);
    const meta = getDecisionMeta(r.comentario);

    const container = mine ? "justify-end" : "justify-start";
    const bubbleBase =
      "max-w-[78%] rounded-2xl px-4 py-3 border shadow-sm";
    const bubbleMine =
      "bg-white/10 border-white/10 text-[#fffef9]/95";
    const bubbleOther =
      "bg-black/25 border-white/10 text-[#fffef9]/95";

    const badge =
      meta?.kind === "APROBADO"
        ? "bg-[#6cbe45]/15 text-[#b9f7a6] border border-[#6cbe45]/40"
        : meta?.kind === "RECHAZADO"
        ? "bg-[#ee2346]/15 text-[#ffb3c2] border border-[#ee2346]/40"
        : "";

    return (
      <div className={`flex ${container} py-2`}>
        <div className={`${bubbleBase} ${mine ? bubbleMine : bubbleOther}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] text-[#fffef9]/80">
              <b>{r.autor_nombre}</b>{" "}
              <span className="text-[#fffef9]/45">• {r.tipo_autor}</span>
            </div>
            <div className="text-[11px] text-[#fffef9]/40">
              {new Date(r.created_at).toLocaleString()}
              {renderTicks(r)}
            </div>
          </div>

          {meta ? (
            <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] ${badge}`}>
              {meta.kind === "APROBADO" ? "✅" : "❌"} {meta.label}
            </div>
          ) : null}

          <div className="mt-2 text-sm whitespace-pre-wrap">
            {r.comentario}
          </div>
        </div>
      </div>
    );
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

          <button className={kanbanStyles.modalClose} onClick={onClose} type="button">
            <span className="inline-flex items-center gap-2">
              <X size={16} /> Cerrar
            </span>
          </button>
        </div>

        <div className="px-4 pb-4">
          {loading ? (
            <div className="text-sm text-[#fffef9]/60 mt-2">Cargando conversación…</div>
          ) : err ? (
            <div className="text-sm text-[#ffb3c2] mt-2">{err}</div>
          ) : emptyText ? (
            <div className="text-sm text-[#fffef9]/60 mt-2">
              No existe un historial de conversación.
            </div>
          ) : (
            <div
              ref={listRef}
              className="mt-3 max-h-[52vh] overflow-auto rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              {rows.map((r) => (
                <MessageBubble key={r.id_comentario} r={r} />
              ))}
            </div>
          )}

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex gap-2">
              <textarea
                className={kanbanStyles.modalTextarea}
                placeholder={
                  isCliente
                    ? "Escribe tu comentario… (obligatorio si vas a aprobar/rechazar)"
                    : "Escribe un comentario…"
                }
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
                title="Enviar comentario"
              >
                <span className="inline-flex items-center gap-2">
                  <Send size={14} />
                  {sending ? "Enviando…" : "Enviar"}
                </span>
              </button>
            </div>

            {isCliente ? (
              <div className="mt-3 flex flex-col md:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => decide("APROBAR")}
                  disabled={!!deciding}
                  className={`${kanbanStyles.modalPrimaryBtn} w-full md:w-auto`}
                  title="Aprobar (requiere comentario)"
                >
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle size={16} />
                    {deciding === "APROBAR" ? "Aprobando…" : "Aprobar"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => decide("RECHAZAR")}
                  disabled={!!deciding}
                  className={`${kanbanStyles.modalSecondaryBtn} w-full md:w-auto border border-[#ee2346]/40`}
                  title="Rechazar (requiere comentario)"
                >
                  <span className="inline-flex items-center gap-2 text-[#ffb3c2]">
                    <XCircle size={16} />
                    {deciding === "RECHAZAR" ? "Rechazando…" : "Rechazar"}
                  </span>
                </button>

                <p className="text-[11px] text-[#fffef9]/50 md:ml-auto md:self-center">
                  Rechazar devuelve a <b>En progreso</b>.
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-2">
            <button type="button" onClick={load} className={kanbanStyles.modalSecondaryBtn} disabled={loading}>
              Recargar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}