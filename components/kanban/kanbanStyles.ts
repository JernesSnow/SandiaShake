// components/kanban/kanbanStyles.ts

export const kanbanStyles = {
  // Layout
  root: "w-full flex flex-col gap-4 text-[var(--ss-text)]",
  boardWrapper: "w-full overflow-x-auto pb-6",
  columnsRow: "flex gap-4 min-w-max",

  // ----------------------------------------------------
  // FILTERS + ACTION BAR
  // ----------------------------------------------------
  filtersRow:
    "flex flex-col md:flex-row md:items-end md:justify-between gap-3",

  label: "text-xs font-medium text-[var(--ss-text2)] block mb-1",

  searchWrapper: "relative",
  searchIcon:
    "absolute inset-y-0 left-0 flex items-center pl-2 text-[var(--ss-text3)]",

  searchInput: `
    w-full rounded-xl px-3 py-2 pl-8 text-sm
    bg-[var(--ss-input)] text-[var(--ss-text)]
    border border-[var(--ss-border)]
    outline-none
    focus:ring-2 focus:ring-[#6cbe45]/20 focus:border-[#6cbe45]/60
  `,

  select: `
    w-full rounded-xl px-3 py-2 text-sm
    bg-[var(--ss-input)] text-[var(--ss-text)]
    border border-[var(--ss-border)]
    outline-none
    focus:ring-2 focus:ring-[#6cbe45]/20 focus:border-[#6cbe45]/60
  `,

  primaryButton: `
    inline-flex items-center gap-2 rounded-xl
    bg-[#ee2346] text-white px-3 py-2 text-sm font-medium
    shadow-sm hover:bg-[#d8203f] active:scale-[.98]
  `,

  successButton: `
    inline-flex items-center gap-2 rounded-xl
    bg-[#6cbe45] text-white px-3 py-2 text-sm font-medium
    shadow-sm hover:bg-[#5aa63d] active:scale-[.98]
  `,

  // ----------------------------------------------------
  // COLUMN WRAPPERS
  // ----------------------------------------------------
  columnWrapperBase: `
    w-72 flex-shrink-0 min-h-[70vh] p-3 rounded-2xl shadow-sm space-y-2
    border border-[var(--ss-border)]
  `,

  columnBgEven: "bg-[var(--ss-surface)]",
  columnBgOdd: "bg-[var(--ss-raised)]",

  columnHeader: "flex items-center justify-between mb-1",

  columnTitle: `
    text-xs font-semibold uppercase tracking-wide
    text-[var(--ss-text2)]
  `,

  columnCount: `
    text-[11px] px-2 py-0.5 rounded-full
    bg-[#ee2346]/15 text-[#ee2346]
  `,

  columnDropAreaBase: `
    space-y-2 rounded-xl p-1 min-h-[60px]
  `,

  columnDropAreaDragging: `
    bg-[var(--ss-raised)]
  `,

  columnDropAreaIdle: `
    bg-transparent
  `,

  // ----------------------------------------------------
  // TASK CARD STYLING
  // ----------------------------------------------------
  cardBase: `
    rounded-xl px-3 py-2 text-xs shadow-sm cursor-pointer
    bg-[var(--ss-surface)] text-[var(--ss-text)]
    border border-[var(--ss-border)]
    transition-all duration-150 hover:shadow-md hover:-translate-y-0.5
  `,

  cardDragging: `
    ring-2 ring-[#ee2346]/40 scale-[1.02]
  `,

  cardBorderIdle: "border-[var(--ss-border)]",

  cardTitle: `
    text-[13px] font-semibold text-[var(--ss-text)]
  `,

  cardMetaRow: `
    mt-1 flex flex-wrap items-center gap-2
    text-[11px] text-[var(--ss-text2)]
  `,

  cardFooterRow: `
    mt-2 flex items-center justify-between
  `,

  cardFooterLeft: "flex flex-col gap-1",

  cardMetaText: "text-[11px] text-[var(--ss-text2)]",
  cardMetaMuted: "text-[11px] text-[var(--ss-text3)]",

  cardLink: `
    inline-flex items-center gap-1 text-[11px]
    text-[var(--ss-text2)] hover:text-[var(--ss-text)]
  `,

  // ----------------------------------------------------
  // MODAL
  // ----------------------------------------------------
  modalOverlay:
    "fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm",

  modalContainer: `
    w-full max-w-xl rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto
    bg-[var(--ss-surface)] border border-[var(--ss-border)]
  `,

  modalHeader: `
    px-5 py-3 border-b border-[var(--ss-border)]
    flex items-center justify-between
    bg-[var(--ss-raised)] rounded-t-2xl
  `,

  modalTitle: "text-sm font-semibold text-[var(--ss-text)]",
  modalClose: "text-xs text-[var(--ss-text2)] hover:text-[var(--ss-text)]",

  modalForm: "p-5 space-y-4 text-sm",
  modalGrid: "grid gap-3 md:grid-cols-2",

  modalInput: `
    w-full rounded-xl px-3 py-2 text-sm
    bg-[var(--ss-input)] text-[var(--ss-text)]
    border border-[var(--ss-border)]
    outline-none focus:ring-2 focus:ring-[#6cbe45]/20 focus:border-[#6cbe45]/60
  `,

  modalTextarea: `
    w-full rounded-xl px-3 py-2 text-sm bg-[var(--ss-input)] text-[var(--ss-text)]
    border border-[var(--ss-border)]
    outline-none focus:ring-2 focus:ring-[#6cbe45]/20 focus:border-[#6cbe45]/60
    min-h-[80px]
  `,

  modalFooter: `
    flex items-center justify-between pt-3 border-t border-[var(--ss-border)]
    bg-[var(--ss-raised)] rounded-b-2xl
  `,

  modalDelete: `
    inline-flex items-center gap-1 text-xs
    text-[#ee2346] hover:text-[#d8203f]
  `,

  modalFooterRight: "ml-auto flex gap-2",

  modalSecondaryBtn: `
    rounded-xl border border-[var(--ss-border)] px-3 py-1.5 text-xs
    text-[var(--ss-text2)] bg-[var(--ss-input)] hover:bg-[var(--ss-raised)]
  `,

  modalPrimaryBtn: `
    rounded-xl bg-[#ee2346] text-white px-3 py-1.5 text-xs font-semibold
    hover:bg-[#d8203f]
  `,
};
