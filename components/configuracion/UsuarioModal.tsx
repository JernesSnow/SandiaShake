"use client";

import { Trash2 } from "react-feather";

/* ------------------ TYPES ------------------ */

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

/* ------------------ PROPS ------------------ */

type Props = {
  editingUser: UsuarioSistema;
  isNewUser: boolean;
  onClose: () => void;
  onChange: (u: UsuarioSistema) => void;
  onSave: () => void;
  onDelete: () => void;
};

/* ------------------ COMPONENT ------------------ */

export default function UsuarioModal({
  editingUser,
  isNewUser,
  onClose,
  onChange,
  onSave,
  onDelete,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-xl bg-[#333132] border border-[#4a4748]/40 shadow-lg">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-[#4a4748]/30 flex items-center justify-between">
          <h3 className="text-white font-semibold">
            {isNewUser ? "Nuevo usuario" : "Editar usuario"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-300 hover:text-white"
          >
            Cerrar
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">
              Nombre
            </label>
            <input
              value={editingUser.nombre}
              onChange={(e) =>
                onChange({ ...editingUser, nombre: e.target.value })
              }
              className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#6cbe45]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">
              Correo
            </label>
            <input
              value={editingUser.correo}
              onChange={(e) =>
                onChange({ ...editingUser, correo: e.target.value })
              }
              className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#6cbe45]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-400 mb-2 block">
                Rol
              </label>
              <select
                value={editingUser.rol}
                onChange={(e) =>
                  onChange({
                    ...editingUser,
                    rol: e.target.value as RolUsuario,
                  })
                }
                className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#6cbe45]"
              >
                <option value="Admin">Admin</option>
                <option value="Colaborador">Colaborador</option>
                <option value="Cliente">Cliente</option>
              </select>
            </div>

            {editingUser.rol === "Admin" && (
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">
                  Nivel de Admin
                </label>
                <select
                  value={editingUser.adminNivel ?? "SECUNDARIO"}
                  onChange={(e) =>
                    onChange({
                      ...editingUser,
                      adminNivel: e.target.value as AdminNivel,
                    })
                  }
                  className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#6cbe45]"
                >
                  <option value="PRIMARIO">PRIMARIO</option>
                  <option value="SECUNDARIO">SECUNDARIO</option>
                </select>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#4a4748]/30">
            {!isNewUser && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-2 rounded-md border border-[#ee2346]/40 bg-[#ee2346]/10 px-3 py-2 text-sm font-semibold text-[#ee2346]"
              >
                <Trash2 size={16} /> Desactivar
              </button>
            )}

            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-md bg-[#6cbe45] px-4 py-2 text-sm font-semibold text-white"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
