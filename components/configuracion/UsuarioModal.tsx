"use client";

import { X, Trash2 } from "react-feather";

type RolUsuario = "Admin" | "Colaborador" | "Cliente";
type AdminNivel = "PRIMARIO" | "SECUNDARIO" | null;

export type UsuarioSistema = {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  estado: "Activo" | "Suspendido";
  adminNivel?: AdminNivel;
};

type Props = {
  editingUser: UsuarioSistema;
  isNewUser: boolean;
  onClose: () => void;
  onChange: (u: UsuarioSistema) => void;
  onSave: () => void;
  onDelete: () => void;
};

const inputCls =
  "w-full rounded-xl px-3 py-2.5 text-sm bg-[var(--ss-input)] text-[var(--ss-text)] " +
  "border border-[var(--ss-border)] outline-none " +
  "focus:ring-2 focus:ring-[#6cbe45]/25 focus:border-[#6cbe45]/60 transition";

export default function UsuarioModal({ editingUser, isNewUser, onClose, onChange, onSave, onDelete }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--ss-surface)] border border-[var(--ss-border)] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--ss-border)] flex items-center justify-between">
          <h3 className="text-[var(--ss-text)] font-semibold">
            {isNewUser ? "Nuevo usuario" : "Editar usuario"}
          </h3>
          <button type="button" onClick={onClose} className="text-[var(--ss-text3)] hover:text-[var(--ss-text)] transition p-1 rounded-lg hover:bg-[var(--ss-overlay)]">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--ss-text2)] block">Nombre</label>
            <input value={editingUser.nombre} onChange={e => onChange({ ...editingUser, nombre: e.target.value })} className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--ss-text2)] block">Correo</label>
            <input value={editingUser.correo} onChange={e => onChange({ ...editingUser, correo: e.target.value })} className={inputCls} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--ss-text2)] block">Rol</label>
              <select value={editingUser.rol} onChange={e => onChange({ ...editingUser, rol: e.target.value as RolUsuario })} className={inputCls}>
                <option value="Admin">Admin</option>
                <option value="Colaborador">Colaborador</option>
                <option value="Cliente">Cliente</option>
              </select>
            </div>

            {editingUser.rol === "Admin" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--ss-text2)] block">Nivel Admin</label>
                <select value={editingUser.adminNivel ?? "SECUNDARIO"} onChange={e => onChange({ ...editingUser, adminNivel: e.target.value as AdminNivel })} className={inputCls}>
                  <option value="PRIMARIO">Primario</option>
                  <option value="SECUNDARIO">Secundario</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--ss-border)]">
            {!isNewUser && (
              <button type="button" onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-xl border border-[#ee2346]/35 bg-[#ee2346]/10 px-3 py-2 text-sm font-semibold text-[#ee2346] hover:bg-[#ee2346]/15 transition">
                <Trash2 size={14} /> Desactivar
              </button>
            )}
            <button type="button" onClick={onSave} className="inline-flex items-center gap-1.5 rounded-xl bg-[#6cbe45] hover:bg-[#5aa63d] px-4 py-2 text-sm font-semibold text-white transition">
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
