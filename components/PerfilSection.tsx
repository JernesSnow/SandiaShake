"use client";

import { useEffect, useState } from "react";
import { User, Mail, Lock, Check, X, Eye, EyeOff, Edit2 } from "react-feather";

const inputCls =
  "w-full rounded-xl px-3 py-2.5 text-sm bg-[var(--ss-input)] text-[var(--ss-text)] " +
  "border border-[var(--ss-border)] outline-none " +
  "focus:ring-2 focus:ring-[#6cbe45]/25 focus:border-[#6cbe45]/60 transition";

const cardCls =
  "rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-sm";

export default function PerfilSection() {
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [editingName, setEditingName]   = useState(false);
  const [draftName, setDraftName]       = useState("");
  const [confirmName, setConfirmName]   = useState(false);
  const [currentPwd, setCurrentPwd]   = useState("");
  const [newPwd, setNewPwd]           = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [profileMsg, setProfileMsg]   = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    fetch("/api/mi-perfil", { credentials: "include", cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setName(d.nombre ?? ""); setEmail(d.correo ?? ""); } })
      .catch(() => {});
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault(); setProfileMsg(null);
    if (!name.trim()) { setProfileMsg("El nombre no puede estar vacío."); return; }
    const wantsPwd = !!(currentPwd || newPwd || confirmPwd);
    if (wantsPwd) {
      if (!currentPwd || !newPwd || !confirmPwd) { setProfileMsg("Completá todos los campos de contraseña."); return; }
      if (newPwd.length < 8) { setProfileMsg("La nueva contraseña debe tener al menos 8 caracteres."); return; }
      if (newPwd !== confirmPwd) { setProfileMsg("Las contraseñas no coinciden."); return; }
    }
    setProfileSaving(true);
    try {
      const res = await fetch("/api/mi-perfil", {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: name.trim(), currentPassword: currentPwd || undefined, newPassword: newPwd || undefined, confirmPassword: confirmPwd || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setProfileMsg(json.message || "Error al actualizar el perfil."); return; }
      setProfileMsg(wantsPwd ? "Contraseña actualizada." : "Perfil actualizado.");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch { setProfileMsg("Error inesperado."); }
    finally { setProfileSaving(false); }
  }

  return (
    <div className={cardCls + " p-6"}>
      <h2 className="text-base font-semibold text-[var(--ss-text)] mb-5 flex items-center gap-2">
        <User size={16} className="text-[#6cbe45]" /> Información del perfil
      </h2>

      <form onSubmit={handleSaveProfile} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--ss-text2)] flex items-center gap-1.5"><User size={12} /> Nombre completo</label>
            {!editingName ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl px-3 py-2.5 text-sm bg-[var(--ss-raised)] border border-[var(--ss-border)] text-[var(--ss-text)]">
                  {name || <span className="text-[var(--ss-text3)]">—</span>}
                </div>
                <button type="button" onClick={() => { setDraftName(name); setEditingName(true); setConfirmName(false); }}
                  className="shrink-0 p-2 rounded-xl border border-[var(--ss-border)] text-[var(--ss-text3)] hover:text-[var(--ss-text)] hover:bg-[var(--ss-overlay)] transition" title="Editar nombre">
                  <Edit2 size={14} />
                </button>
              </div>
            ) : confirmName ? (
              <div className="rounded-xl bg-[#facc15]/10 border border-[#facc15]/30 p-3 space-y-2">
                <p className="text-xs text-[#facc15] font-medium">¿Cambiar nombre a <span className="font-bold">"{draftName.trim()}"</span>?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setName(draftName.trim()); setEditingName(false); setConfirmName(false); }}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#6cbe45] hover:bg-[#5aa63d] px-3 py-1.5 text-xs font-semibold text-white transition">
                    <Check size={12} /> Confirmar
                  </button>
                  <button type="button" onClick={() => { setEditingName(false); setConfirmName(false); }}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--ss-border)] px-3 py-1.5 text-xs text-[var(--ss-text2)] hover:bg-[var(--ss-overlay)] transition">
                    <X size={12} /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input type="text" value={draftName} onChange={e => setDraftName(e.target.value)} autoFocus className={inputCls + " flex-1"} />
                <button type="button" onClick={() => { if (draftName.trim() && draftName.trim() !== name) setConfirmName(true); else { setEditingName(false); } }}
                  className="shrink-0 p-2 rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] text-white transition" title="Guardar">
                  <Check size={14} />
                </button>
                <button type="button" onClick={() => { setEditingName(false); setConfirmName(false); }}
                  className="shrink-0 p-2 rounded-xl border border-[var(--ss-border)] text-[var(--ss-text3)] hover:text-[var(--ss-text)] hover:bg-[var(--ss-overlay)] transition" title="Cancelar">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Email — read-only */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--ss-text2)] flex items-center gap-1.5"><Mail size={12} /> Correo electrónico</label>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm bg-[var(--ss-raised)] border border-[var(--ss-border)] text-[var(--ss-text2)]">
              <span className="flex-1 truncate">{email}</span>
              <span className="shrink-0 text-[10px] text-[var(--ss-text3)] bg-[var(--ss-overlay)] px-2 py-0.5 rounded-full">Solo lectura</span>
            </div>
          </div>

        </div>

        <div className="pt-4 border-t border-[var(--ss-border)]">
          <h3 className="text-sm font-semibold text-[var(--ss-text)] mb-4 flex items-center gap-2">
            <Lock size={15} /> Cambiar contraseña
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Contraseña actual", val: currentPwd, setVal: setCurrentPwd, show: showCurrent, toggle: () => setShowCurrent(s => !s) },
              { label: "Nueva contraseña",   val: newPwd,     setVal: setNewPwd,     show: showNew,     toggle: () => setShowNew(s => !s)     },
              { label: "Confirmar contraseña",val: confirmPwd, setVal: setConfirmPwd, show: showConfirm, toggle: () => setShowConfirm(s => !s) },
            ].map(f => (
              <div key={f.label} className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">{f.label}</label>
                <div className="relative">
                  <input type={f.show ? "text" : "password"} value={f.val} onChange={e => f.setVal(e.target.value)} className={inputCls + " pr-10"} />
                  <button type="button" onClick={f.toggle} className="absolute inset-y-0 right-0 px-3 text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition">
                    {f.show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {profileMsg && (
          <div className={`rounded-xl px-4 py-2.5 text-xs border ${profileMsg.includes("actualiz") ? "bg-[#6cbe45]/10 border-[#6cbe45]/30 text-[#6cbe45]" : "bg-[#ee2346]/10 border-[#ee2346]/25 text-[#ee2346]"}`}>
            {profileMsg}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={profileSaving} className="rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] disabled:opacity-60 px-5 py-2.5 text-sm font-semibold text-white transition">
            {profileSaving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
