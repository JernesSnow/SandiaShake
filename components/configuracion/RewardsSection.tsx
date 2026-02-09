"use client";

import { Award, Gift, Bell } from "react-feather";

/* ------------------ PROPS ------------------ */

type Props = {
  chilliAutoAward: boolean;
  setChilliAutoAward: (v: boolean) => void;
  chilliPointsOnTime: number;
  setChilliPointsOnTime: (v: number) => void;

  rewardEnabled: boolean;
  setRewardEnabled: (v: boolean) => void;
  rewardCatalogVisible: boolean;
  setRewardCatalogVisible: (v: boolean) => void;

  notifDailyDigest: boolean;
  setNotifDailyDigest: (v: boolean) => void;
  notifDueSoon: boolean;
  setNotifDueSoon: (v: boolean) => void;
  notifMorosidad: boolean;
  setNotifMorosidad: (v: boolean) => void;
};

/* ------------------ COMPONENT ------------------ */

export default function RewardsSection({
  chilliAutoAward,
  setChilliAutoAward,
  chilliPointsOnTime,
  setChilliPointsOnTime,
  rewardEnabled,
  setRewardEnabled,
  rewardCatalogVisible,
  setRewardCatalogVisible,
  notifDailyDigest,
  setNotifDailyDigest,
  notifDueSoon,
  setNotifDueSoon,
  notifMorosidad,
  setNotifMorosidad,
}: Props) {
  return (
    <div className="bg-[#333132] rounded-xl border border-[#4a4748]/40 shadow mb-6">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Award size={18} className="text-[#ee2346]" />
          Chilli Points, premios y notificaciones
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Chilli points */}
          <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Gift size={16} className="text-[#ee2346]" />
              Chilli Points
            </h3>

            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={chilliAutoAward}
                onChange={(e) => setChilliAutoAward(e.target.checked)}
                className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
              />
              Otorgación automática por entregas puntuales
            </label>

            <div className="mt-3">
              <label className="text-sm font-medium text-gray-400 mb-2 block">
                Puntos por entrega puntual
              </label>
              <input
                type="number"
                min={0}
                value={chilliPointsOnTime}
                onChange={(e) =>
                  setChilliPointsOnTime(Number(e.target.value))
                }
                className="w-full rounded-md border border-[#3a3a40] bg-[#1a1a1d] text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6cbe45]"
              />
              <p className="text-[11px] text-gray-400 mt-2">
                Recomendación: 5–15 por entregable según dificultad.
              </p>
            </div>
          </div>

          {/* Rewards */}
          <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Gift size={16} className="text-[#7dd3fc]" />
              Premios
            </h3>

            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={rewardEnabled}
                onChange={(e) => setRewardEnabled(e.target.checked)}
                className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
              />
              Habilitar canje de premios
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={rewardCatalogVisible}
                onChange={(e) =>
                  setRewardCatalogVisible(e.target.checked)
                }
                className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
              />
              Mostrar catálogo de premios a colaboradores
            </label>

            <p className="text-[11px] text-gray-400 mt-3">
              El CRUD del catálogo de premios puede ir en el módulo de
              “Configuración” o “Colaboradores”.
            </p>
          </div>

          {/* Notifications */}
          <div className="rounded-lg border border-[#4a4748]/40 bg-[#2b2b30] p-4 md:col-span-2">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Bell size={16} className="text-[#6cbe45]" />
              Notificaciones
            </h3>

            <div className="grid gap-2 md:grid-cols-3">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifDailyDigest}
                  onChange={(e) =>
                    setNotifDailyDigest(e.target.checked)
                  }
                  className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
                />
                Resumen diario
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifDueSoon}
                  onChange={(e) =>
                    setNotifDueSoon(e.target.checked)
                  }
                  className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
                />
                Alertas por vencimiento
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifMorosidad}
                  onChange={(e) =>
                    setNotifMorosidad(e.target.checked)
                  }
                  className="rounded border-[#3a3a40] bg-[#1a1a1d] text-[#6cbe45] focus:ring-[#6cbe45]"
                />
                Morosidad / bloqueo
              </label>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() =>
              alert("Guardar configuraciones (pendiente)")
            }
            className="px-6 py-2 rounded-md bg-[#6cbe45] hover:bg-[#5fa93d] text-white text-sm font-semibold transition"
          >
            Guardar configuraciones
          </button>
        </div>
      </div>
    </div>
  );
}
