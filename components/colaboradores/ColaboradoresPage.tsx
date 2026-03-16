"use client";

import { useEffect, useState } from "react";
import { Edit2, Trash2, Heart } from "react-feather";
import { useRouter } from "next/navigation";

type MentalState = "Estable" | "Atento" | "En riesgo";
type EstadoCuenta = "Activo" | "Suspendido";

type RolColaborador =
  | "Admin"
  | "Ejecutivo de cuenta"
  | "Diseñador"
  | "Editor"
  | "Community Manager";

type Colaborador = {
  id: string;
  nombre: string;
  email: string;
  rol: RolColaborador;
  estadoCuenta: EstadoCuenta;
  mentalState: MentalState;
  totalTareas: number;
  tareasPendientes: number;
  tareasAprobadas: number;
  chilliPoints: number;
};

function estadoBadge(estado: EstadoCuenta) {
  return estado === "Activo"
    ? "bg-[#6cbe45]/20 text-[#6cbe45]"
    : "bg-[#ee2346]/20 text-[#ee2346]";
}

function mentalBadge(mental: MentalState) {
  if (mental === "Estable") return "bg-[#6cbe45]/20 text-[#6cbe45]";
  if (mental === "Atento") return "bg-[#facc15]/20 text-[#facc15]";
  return "bg-[#ee2346]/20 text-[#ee2346]";
}

export function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/colaboradores");

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("API ERROR:", err);
        return;
      }

      const json = await res.json();

      if (!Array.isArray(json.colaboradores)) {
        console.error("Unexpected response shape:", json);
        return;
      }

      const mapped: Colaborador[] = json.colaboradores.map((u: any) => ({
        id: String(u.id_usuario),
        nombre: u.nombre,
        email: u.correo,
        rol: u.rol === "ADMIN" ? "Admin" : "Ejecutivo de cuenta",
        estadoCuenta: u.estado === "ACTIVO" ? "Activo" : "Suspendido",
        mentalState: "Estable",
        totalTareas: u.totalTareas ?? 0,
        tareasPendientes: u.tareasPendientes ?? 0,
        tareasAprobadas: u.tareasAprobadas ?? 0,
        chilliPoints: u.chilliPoints ?? 0,
      }));

      setColaboradores(mapped);
    })();
  }, []);

  return (
    <div className="space-y-6 text-white">

      <h1 className="text-xl font-semibold">Equipo</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

        {colaboradores.map((c) => (

          <div
            key={c.id}
            onClick={() => router.push(`/colaboradores/${c.id}`)}
            className="cursor-pointer rounded-xl bg-[#333132] border border-[#4a4748]/40 shadow-xl hover:border-[#ee2346]/60 transition"
          >

            {/* HEADER */}

            <div className="p-6 flex gap-4">

              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#ee2346] to-[#7dd3fc] flex items-center justify-center text-xl font-bold">
                {c.nombre.charAt(0)}
              </div>

              <div>
                <div className="text-lg font-semibold">{c.nombre}</div>
                <div className="text-sm text-gray-400">{c.email}</div>

                <div className="flex gap-2 mt-2">

                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${estadoBadge(
                      c.estadoCuenta
                    )}`}
                  >
                    {c.estadoCuenta}
                  </span>

                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${mentalBadge(
                      c.mentalState
                    )}`}
                  >
                    <Heart size={12} className="inline mr-1" />
                    {c.mentalState}
                  </span>

                </div>
              </div>

            </div>

            {/* STATS */}

            <div className="grid grid-cols-4 gap-3 px-6 pb-6 text-center">

              <div className="bg-[#2b2b30] rounded-lg p-3">
                <div className="text-lg font-bold">{c.totalTareas}</div>
                <div className="text-xs text-gray-400">Tareas</div>
              </div>

              <div className="bg-[#2b2b30] rounded-lg p-3">
                <div className="text-lg font-bold">{c.tareasAprobadas}</div>
                <div className="text-xs text-gray-400">Aprobadas</div>
              </div>

              <div className="bg-[#2b2b30] rounded-lg p-3">
                <div className="text-lg font-bold">{c.tareasPendientes}</div>
                <div className="text-xs text-gray-400">Pendientes</div>
              </div>

              <div className="bg-[#2b2b30] rounded-lg p-3">
                <div className="text-lg font-bold text-[#ee2346] flex justify-center items-center gap-1">
                  🌶 {c.chilliPoints}
                </div>
                <div className="text-xs text-gray-400">Chilli</div>
              </div>

            </div>

            {/* ACTIONS */}

            <div className="flex justify-end gap-2 px-6 pb-6">

              <button
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="inline-flex items-center gap-2 rounded-md border border-[#4a4748]/40 px-3 py-2 text-sm hover:bg-[#3a3738]"
              >
                <Edit2 size={14} /> Editar
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="inline-flex items-center gap-2 rounded-md border border-[#ee2346]/40 bg-[#ee2346]/10 px-3 py-2 text-sm text-[#ee2346]"
              >
                <Trash2 size={14} /> Desactivar
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}