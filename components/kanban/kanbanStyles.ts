// components/kanban/kanbanStyles.ts

// Brand tokens
export const brand = {
  dark: "#333132",        // Base dark background
  darkSoft: "#3d3b3c",    // Slightly lighter variant
  darkLighter: "#4a4748", // Mid gray tone
  light: "#fffef9",       // Contrast text
  alert: "#ee2346",       // Sandía red
  success: "#6cbe45",     // Success green
};

// Shared helpers
const borderSoft = "border border-[#4a4748]/40";
const glass = "backdrop-blur-sm bg-white/5";

// ------------------------------------------------------
// NEW DARK-MODE KANBAN STYLES
// ------------------------------------------------------
export const kanbanStyles = {
  // Layout
  root: "w-full flex flex-col gap-4 text-[#fffef9]",
  boardWrapper: "w-full overflow-x-auto pb-6",
  columnsRow: "flex gap-4 min-w-max",

  // ----------------------------------------------------
  // FILTERS + ACTION BAR
  // ----------------------------------------------------
  filtersRow:
    "flex flex-col md:flex-row md:items-end md:justify-between gap-3",

  label: "text-xs font-medium text-[#fffef9]/80 block mb-1",

  searchWrapper: "relative",
  searchIcon:
    "absolute inset-y-0 left-0 flex items-center pl-2 text-[#fffef9]/40",

  searchInput: `
    w-full rounded-md px-3 py-2 pl-8 text-sm 
    bg-[#3d3b3c] text-[#fffef9] 
    ${borderSoft}
    outline-none 
    focus:ring-2 focus:ring-[#ee2346]/70
  `,

  select: `
    w-full rounded-md px-3 py-2 text-sm 
    bg-[#3d3b3c] text-[#fffef9]
    ${borderSoft}
    outline-none 
    focus:ring-2 focus:ring-[#ee2346]/70
  `,

  primaryButton: `
    inline-flex items-center gap-2 rounded-md 
    bg-[#ee2346] text-[#fffef9] px-3 py-2 text-sm font-medium 
    shadow-sm hover:bg-[#d8203f] active:scale-[.98]
  `,

  successButton: `
    inline-flex items-center gap-2 rounded-md 
    bg-[#6cbe45] text-[#fffef9] px-3 py-2 text-sm font-medium 
    shadow-sm hover:bg-[#5aa63d] active:scale-[.98]
  `,

  // ----------------------------------------------------
  // COLUMN WRAPPERS
  // ----------------------------------------------------
  columnWrapperBase: `
    w-72 flex-shrink-0 min-h-[70vh] p-3 rounded-xl shadow-sm space-y-2 
    ${borderSoft}
  `,

  // Alternate subtle gray shades
  columnBgEven: "bg-[#3d3b3c]",
  columnBgOdd: "bg-[#4a4748]",

  columnHeader: "flex items-center justify-between mb-1",

  // COLUMN TITLES NOW **RED** (Sandía Con Chile red)
  columnTitle: `
    text-xs font-semibold uppercase tracking-wide
    text-[#fffef9]
  `,

  columnCount: `
    text-[11px] px-2 py-0.5 rounded-full 
    bg-[#ee2346]/20 text-[#ee2346]
  `,

  columnDropAreaBase: `
    space-y-2 rounded-lg p-1 min-h-[60px]
  `,

  columnDropAreaDragging: `
    bg-[#fffef9]/10
  `,

  columnDropAreaIdle: `
    bg-[#fffef9]/5
  `,

  // ----------------------------------------------------
  // TASK CARD STYLING
  // ----------------------------------------------------
  cardBase: `
    rounded-lg px-3 py-2 text-xs shadow-sm cursor-pointer
    bg-[#333132] text-[#fffef9]
    ${borderSoft}
    transition-all duration-150
  `,

  cardDragging: `
    ring-2 ring-[#ee2346]/40 scale-[1.02]
  `,

  cardBorderIdle: "border-[#fffef9]/10",

  cardTitle: `
    text-[13px] font-semibold text-[#fffef9]
  `,

  cardMetaRow: `
    mt-1 flex flex-wrap items-center gap-2 
    text-[11px] text-[#fffef9]/70
  `,

  cardFooterRow: `
    mt-2 flex items-center justify-between
  `,

  cardFooterLeft: "flex flex-col gap-1",

  cardMetaText: "text-[11px] text-[#fffef9]/75",
  cardMetaMuted: "text-[11px] text-[#fffef9]/50",

  cardLink: `
    inline-flex items-center gap-1 text-[11px] 
    text-[#fffef9]/70 hover:text-[#fffef9]
  `,

  // ----------------------------------------------------
  // MODAL (Dark mode!)
  // ----------------------------------------------------
  modalOverlay:
    "fixed inset-0 z-40 flex items-center justify-center bg-black/60",

  modalContainer: `
    w-full max-w-xl rounded-xl shadow-xl max-h-[90vh] overflow-y-auto 
    bg-[#333132] border border-[#fffef9]/10
  `,

  modalHeader: `
    px-5 py-3 border-b border-[#fffef9]/10 
    flex items-center justify-between 
    bg-[#3d3b3c] rounded-t-xl
  `,

  modalTitle: "text-sm font-semibold text-[#fffef9]",
  modalClose: "text-xs text-[#fffef9]/70 hover:text-[#fffef9]",

  modalForm: "p-5 space-y-4 text-sm",
  modalGrid: "grid gap-3 md:grid-cols-2",

  modalInput: `
    w-full rounded-md px-3 py-2 text-sm 
    bg-[#4a4748] text-[#fffef9] 
    border border-[#fffef9]/15
    outline-none focus:ring-2 focus:ring-[#ee2346]/70
  `,

  modalTextarea: `
    w-full rounded-md px-3 py-2 text-sm bg-[#4a4748] text-[#fffef9]
    border border-[#fffef9]/15
    outline-none focus:ring-2 focus:ring-[#ee2346]/70
    min-h-[80px]
  `,

  modalFooter: `
    flex items-center justify-between pt-3 border-t border-[#fffef9]/10 
    bg-[#3d3b3c] rounded-b-xl
  `,

  modalDelete: `
    inline-flex items-center gap-1 text-xs 
    text-[#ee2346] hover:text-[#d8203f]
  `,

  modalFooterRight: "ml-auto flex gap-2",

  modalSecondaryBtn: `
    rounded-md border border-[#fffef9]/20 px-3 py-1.5 text-xs 
    text-[#fffef9]/80 bg-[#4a4748] hover:bg-[#3d3b3c]
  `,

  modalPrimaryBtn: `
    rounded-md bg-[#ee2346] text-[#fffef9] px-3 py-1.5 text-xs font-semibold 
    hover:bg-[#d8203f]
  `,
};
