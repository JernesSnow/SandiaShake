"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";

import PerfilSection from "@/components/configuracion/PerfilSection";
import UsuariosSection from "@/components/configuracion/UsuariosSection";
import RewardsSection from "@/components/configuracion/RewardsSection";
import GoogleDriveSection from "@/components/configuracion/GoogleDriveSection";
import DatabaseSection from "@/components/configuracion/DatabaseSection";
import HostingSection from "@/components/configuracion/HostingSection";
import UsuarioModal from "@/components/configuracion/UsuarioModal";



export type RolUsuario = "Admin" | "Colaborador" | "Cliente";
export type EstadoUsuario = "Activo" | "Suspendido";
export type AdminNivel = "PRIMARIO" | "SECUNDARIO" | null;

export type UsuarioSistema = {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  adminNivel?: AdminNivel;
};



function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function normalizeAdminNivel(value: any): AdminNivel {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "PRIMARIO") return "PRIMARIO";
  if (v === "SECUNDARIO") return "SECUNDARIO";
  return null;
}

function restoreDeletedEmail(email: string) {
  return email.replace(/^__deleted__\d+__/, "");
}



export default function ConfiguracionPage() {
  const router = useRouter();

 
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentAdminNivel, setCurrentAdminNivel] =
    useState<AdminNivel>(null);


  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

 
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] =
    useState<RolUsuario | "Todos">("Todos");

  const [editingUser, setEditingUser] =
    useState<UsuarioSistema | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);
  const [noAutenticado, setNoAutenticado] = useState(false);


  const [chilliAutoAward, setChilliAutoAward] = useState(true);
  const [chilliPointsOnTime, setChilliPointsOnTime] = useState(10);
  const [rewardEnabled, setRewardEnabled] = useState(true);
  const [rewardCatalogVisible, setRewardCatalogVisible] = useState(true);
  const [notifDailyDigest, setNotifDailyDigest] = useState(true);
  const [notifDueSoon, setNotifDueSoon] = useState(true);
  const [notifMorosidad, setNotifMorosidad] = useState(true);

  const [driveEnabled, setDriveEnabled] = useState(true);
  const [driveFolderBase, setDriveFolderBase] = useState(
    "https://drive.google.com/drive/folders/xxxxx"
  );

  const [dbProvider, setDbProvider] = useState("Supabase (PostgreSQL)");
  const [dbRealtime, setDbRealtime] = useState(true);
  const [dbRlsEnabled, setDbRlsEnabled] = useState(true);

  const [hostingProvider, setHostingProvider] = useState("Railway");
  const [envMode, setEnvMode] =
    useState<"Testing" | "Production">("Testing");


  async function cargarPerfil() {
    const res = await fetch("/api/mi-perfil", {
      credentials: "include",
      cache: "no-store",
    });

    const json = safeJsonParse(await res.text());

    if (res.status === 401) {
      setNoAutenticado(true);
      router.push("/auth");
      return;
    }

    setName(json?.nombre ?? "");
    setEmail(json?.correo ?? "");
    setCurrentUserId(String(json?.id_usuario ?? ""));
    setCurrentAdminNivel(normalizeAdminNivel(json?.admin_nivel));
  }


  async function cargarUsuarios() {
    setCargandoUsuarios(true);
    setErrorUsuarios(null);

    try {
      const res = await fetch("/api/admin/usuarios", {
        credentials: "include",
        cache: "no-store",
      });

      const json = safeJsonParse(await res.text());

      if (res.status === 401) {
        setNoAutenticado(true);
        return;
      }

      if (!res.ok) {
        setErrorUsuarios(json?.error ?? "Error cargando usuarios");
        return;
      }

      setUsuarios(
        (json.usuarios ?? []).map((u: any) => ({
          id: String(u.id_usuario),
          nombre: u.nombre ?? "",
          correo: u.correo ?? "",
          rol:
            u.rol === "ADMIN"
              ? "Admin"
              : u.rol === "COLABORADOR"
              ? "Colaborador"
              : "Cliente",
          estado: u.estado === "ACTIVO" ? "Activo" : "Suspendido",
          adminNivel: normalizeAdminNivel(u.admin_nivel),
        }))
      );
    } finally {
      setCargandoUsuarios(false);
    }
  }

  useEffect(() => {
    cargarPerfil();
    cargarUsuarios();
  }, []);



  function openNewUser() {
    setIsNewUser(true);
    setEditingUser({
      id: "",
      nombre: "",
      correo: "",
      rol: "Colaborador",
      estado: "Activo",
      adminNivel: "SECUNDARIO",
    });
  }

  function openEditUser(u: UsuarioSistema) {
    setIsNewUser(false);
    setEditingUser({ ...u });
  }

  async function toggleUserStatus(id: string, estado: EstadoUsuario) {
    const target = usuarios.find((u) => u.id === id);
    if (!target) return;

    if (estado === "Activo") {
     
      await fetch(`/api/admin/usuarios/${id}/desactivar`, {
        method: "POST",
        credentials: "include",
      });
    } else {
    
      await fetch(`/api/admin/usuarios/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: restoreDeletedEmail(target.correo),
          estado: "ACTIVO",
        }),
      });
    }

    await cargarUsuarios();
  }


  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();

    await fetch("/api/mi-perfil", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: name.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
        confirmPassword: confirmPassword || undefined,
      }),
    });

    alert("Perfil actualizado correctamente");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold mb-6 text-white">Configuración</h1>

      <PerfilSection
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        currentPassword={currentPassword}
        setCurrentPassword={setCurrentPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        onSave={handleSaveProfile}
      />

      <UsuariosSection
        usuarios={usuarios}
        userSearch={userSearch}
        setUserSearch={setUserSearch}
        userRoleFilter={userRoleFilter}
        setUserRoleFilter={setUserRoleFilter}
        currentUserId={currentUserId}
        currentAdminNivel={currentAdminNivel}
        cargarUsuarios={cargarUsuarios}
        openNewUser={openNewUser}
        openEditUser={openEditUser}
        toggleUserStatus={toggleUserStatus}
        cargandoUsuarios={cargandoUsuarios}
        errorUsuarios={errorUsuarios}
      />

      <RewardsSection
        chilliAutoAward={chilliAutoAward}
        setChilliAutoAward={setChilliAutoAward}
        chilliPointsOnTime={chilliPointsOnTime}
        setChilliPointsOnTime={setChilliPointsOnTime}
        rewardEnabled={rewardEnabled}
        setRewardEnabled={setRewardEnabled}
        rewardCatalogVisible={rewardCatalogVisible}
        setRewardCatalogVisible={setRewardCatalogVisible}
        notifDailyDigest={notifDailyDigest}
        setNotifDailyDigest={setNotifDailyDigest}
        notifDueSoon={notifDueSoon}
        setNotifDueSoon={setNotifDueSoon}
        notifMorosidad={notifMorosidad}
        setNotifMorosidad={setNotifMorosidad}
      />

      <GoogleDriveSection
        driveEnabled={driveEnabled}
        setDriveEnabled={setDriveEnabled}
        driveFolderBase={driveFolderBase}
        setDriveFolderBase={setDriveFolderBase}
      />

      <DatabaseSection
        dbProvider={dbProvider}
        setDbProvider={setDbProvider}
        dbRealtime={dbRealtime}
        setDbRealtime={setDbRealtime}
        dbRlsEnabled={dbRlsEnabled}
        setDbRlsEnabled={setDbRlsEnabled}
      />

      <HostingSection
        hostingProvider={hostingProvider}
        setHostingProvider={setHostingProvider}
        envMode={envMode}
        setEnvMode={setEnvMode}
      />

      {editingUser && (
        <UsuarioModal
          editingUser={editingUser}
          isNewUser={isNewUser}
          onClose={() => {
            setEditingUser(null);
            setIsNewUser(false);
          }}
          onChange={setEditingUser}
          onSave={async () => {
            const endpoint = isNewUser
              ? "/api/admin/crear-usuario"
              : `/api/admin/usuarios/${editingUser.id}`;

            await fetch(endpoint, {
              method: isNewUser ? "POST" : "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nombre: editingUser.nombre,
                correo: editingUser.correo,
                rol: editingUser.rol.toUpperCase(),
                admin_nivel:
                  editingUser.rol === "Admin"
                    ? editingUser.adminNivel
                    : null,
              }),
            });

            await cargarUsuarios();
            setEditingUser(null);
            setIsNewUser(false);
          }}
          onDelete={async () => {
            await fetch(
              `/api/admin/usuarios/${editingUser.id}/desactivar`,
              { method: "POST", credentials: "include" }
            );
            await cargarUsuarios();
            setEditingUser(null);
          }}
        />
      )}
    </Shell>
  );
}
