// components/kanban/TaskCard.tsx
"use client";

import React from "react";
import { Calendar, User, Link as LinkIcon, MessageCircle } from "react-feather";

type Props = {
  task: any;
  onOpenDetails?: (task: any) => void;
  onOpenChat?: (task: any) => void;
};

export function TaskCard({ task, onOpenDetails, onOpenChat }: Props) {
  return (
    <div
      className="
        bg-white 
        rounded-xl 
        border 
        border-[#e8e5dd]
        p-4 
        shadow-sm 
        hover:shadow-md 
        transition-all 
        duration-200
        cursor-pointer
      "
      onClick={() => onOpenDetails?.(task)} // ✅ abrir detalles
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm text-[#2e2e2e] mb-1">
          {task.title}
        </h3>

        {/* ✅ Botón chat */}
        {onOpenChat && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // 🚫 no abre detalles
              onOpenChat(task);
            }}
            className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-100"
            title="Abrir conversación"
          >
            <MessageCircle size={14} />
            Chat
          </button>
        )}
      </div>

      {/* Client & Assigned */}
      <div className="text-xs text-[#666] flex items-center gap-1 mb-2">
        <User size={12} />
        {task.cliente} — {task.asignado}
      </div>

      {/* Fecha */}
      <div className="text-xs text-[#666] flex items-center gap-1 mb-2">
        <Calendar size={12} />
        {task.fecha}
      </div>

      {/* Google Drive */}
      {task.drive && (
        <a
          href={task.drive}
          target="_blank"
          onClick={(e) => e.stopPropagation()}
          className="text-xs flex items-center gap-1 text-[#5c5aff] hover:underline"
        >
          <LinkIcon size={12} />
          Drive
        </a>
      )}

      {/* Priority */}
      {task.prioridad && (
        <span
          className={`
            inline-block mt-3 px-2 py-1 text-xs rounded-full
            ${
              task.prioridad === "Alta"
                ? "bg-red-100 text-red-700 border border-red-200"
                : task.prioridad === "Media"
                ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                : "bg-green-100 text-green-700 border border-green-200"
            }
          `}
        >
          {task.prioridad}
        </span>
      )}
    </div>
  );
}