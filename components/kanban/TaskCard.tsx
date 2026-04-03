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
      className="bg-[var(--ss-surface)] rounded-xl border border-[var(--ss-border)] p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
      onClick={() => onOpenDetails?.(task)}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm text-[var(--ss-text)] mb-1">
          {task.title}
        </h3>

        {onOpenChat && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenChat(task); }}
            className="text-xs flex items-center gap-1 px-2 py-1 rounded-xl border border-[var(--ss-border)] hover:bg-[var(--ss-raised)] text-[var(--ss-text2)]"
            title="Abrir conversación"
          >
            <MessageCircle size={14} />
            Chat
          </button>
        )}
      </div>

      <div className="text-xs text-[var(--ss-text2)] flex items-center gap-1 mb-2">
        <User size={12} />
        {task.cliente} — {task.asignado}
      </div>

      <div className="text-xs text-[var(--ss-text2)] flex items-center gap-1 mb-2">
        <Calendar size={12} />
        {task.fecha}
      </div>

      {task.drive && (
        <a
          href={task.drive}
          target="_blank"
          onClick={(e) => e.stopPropagation()}
          className="text-xs flex items-center gap-1 text-[#6cbe45] hover:underline"
        >
          <LinkIcon size={12} />
          Drive
        </a>
      )}

      {task.prioridad && (
        <span
          className={`inline-block mt-3 px-2 py-1 text-xs rounded-full ${
            task.prioridad === "Alta"
              ? "bg-[#ee2346]/15 text-[#ee2346] border border-[#ee2346]/40"
              : task.prioridad === "Media"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/40"
              : "bg-[#6cbe45]/15 text-[#4a8c2a] dark:text-[#b9f7a6] border border-[#6cbe45]/40"
          }`}
        >
          {task.prioridad}
        </span>
      )}
    </div>
  );
}
