"use client";

import { useMemo } from "react";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Check,
} from "react-feather";
import {
  UsuarioSistema,
  RolUsuario,
  AdminNivel,
  EstadoUsuario,
} from "@/app/configuracion/page";

/* ------------------ PERMISSIONS ------------------ */

function canEditUser(
  currentUserId: string,
  currentAdminNivel: AdminNivel,
  target: UsuarioSistema
) {
  if (currentUserId === target.id) return true;
  if (target.rol !== "Admin") return true;
  if (currentAdminNivel === "PRIMARIO") return true;
  return false;
}

function canDeleteUser(
  currentUserId: string,
  currentAdminNivel: AdminNivel,
  target: UsuarioSistema
) {
  if (currentUserId === target.id) return false;
  return canEditUser(currentUserId, currentAdminNivel, target);
}

/* ------------------ PROPS ------------------ */

type Props = {
  usuarios: UsuarioSistema[];

  userSearch: string;
  setUserSearch: (v: string) => void;

  userRoleFilter: RolUsuario | "Todos";
  setUserRoleFilter: (v: RolUsuario | "Todos") => void;

  currentUserId: string;
  currentAdminNivel: AdminNivel;

  cargarUsuarios: () => void;

  openNewUser: () => void;
  openEditUser: (u: UsuarioSistema) => void;

  toggleUserStatus: (id: string, estado: EstadoUsuario) => void;

  cargandoUsuarios: boolean;
  errorUsuarios: string | null;
};

/* ------------------ COMPONENT ------------------ */

export default function UsuariosSection({
  usuarios,
  userSearch,
  setUserSearch,
  userRoleFilter,
  setUserRoleFilter,
  currentUserId,
  currentAdminNivel,
  cargarUsuarios,
  openNewUser,
  openEditUser,
  toggleUserStatus,
  cargandoUsuarios,
  errorUsuarios,
}: Props) {


  const filteredUsuarios = useMemo(() => {
    const s = (userSearch ?? "").toLowerCase();

    return usuarios
      .filter((u) => {
      
        if (currentAdminNivel === "SECUNDARIO") {
          return u.rol == "Cliente";
        }
        return true; 
      })
      .filter((u) => {
        const matchesSearch =
          !s ||
          (u.nombre ?? "").toLowerCase().includes(s) ||
          (u.correo ?? "").toLowerCase().includes(s);

        const matchesRole =
          userRoleFilter === "Todos" || u.rol === userRoleFilter;

        return matchesSearch && matchesRole;
      });
  }, [usuarios, userSearch, userRoleFilter, currentAdminNivel]);

  return (
    <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
      <div className="p-6">

        {/* HEADER */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users size={18} className="text-[#7dd3fc]" />
              Gestión de usuarios
            </h2>
            <p className="text-[11px] text-gray-400 mt-1">
              Lista desde <span className="text-gray-200">/api/admin/usuarios</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cargarUsuarios}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold border border-[#4a4748]/40 text-gray-200 hover:bg-[#3a3738]"
            >
              Recargar
            </button>

            <button
              type="button"
              onClick={openNewUser}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold bg-[#ee2346] text-white hover:bg-[#d8203f]"
            >
              <Plus size={16} /> Nuevo usuario
            </button>
          </div>
        </div>

        {cargandoUsuarios && (
          <p className="text-sm text-gray-300 mb-3">Cargando usuarios...</p>
        )}

        {errorUsuarios && (
          <p className="text-sm text-red-400 mb-3">{errorUsuarios}</p>
        )}

        {/* FILTERS */}
        <div className="grid gap-3 md:grid-cols-3 mb-4">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-400 mb-2 block">
              Buscar por nombre o correo
            </label>
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">
              Filtrar por rol
            </label>
            <select
              value={userRoleFilter}
              onChange={(e) =>
                setUserRoleFilter(e.target.value as RolUsuario | "Todos")
              }
              className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm"
            >
              <option value="Todos">Todos</option>
              <option value="Colaborador">Colaborador</option>
              <option value="Cliente">Cliente</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-lg border border-[#4a4748]/40">
          <table className="w-full text-sm">
            <thead className="bg-[#2b2b30] text-gray-300">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Correo</th>
                <th className="text-left px-4 py-3">Rol</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="bg-[#333132] text-gray-200">
              {filteredUsuarios.map((u) => (
                <tr key={u.id} className="border-t border-[#4a4748]/30">
                  <td className="px-4 py-3">{u.nombre}</td>
                  <td className="px-4 py-3 text-gray-300">{u.correo}</td>
                  <td className="px-4 py-3">{u.rol}</td>
                  <td className="px-4 py-3">{u.estado}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditUser(u)}
                        disabled={!canEditUser(currentUserId, currentAdminNivel, u)}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                      >
                        <Edit2 size={14} /> Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleUserStatus(u.id, u.estado)}
                        disabled={!canDeleteUser(currentUserId, currentAdminNivel, u)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
                      >
                        {u.estado === "Activo" ? (
                          <>
                            <Trash2 size={14} /> Desactivar
                          </>
                        ) : (
                          <>
                            <Check size={14} /> Activar
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!cargandoUsuarios && filteredUsuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    No hay usuarios que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
