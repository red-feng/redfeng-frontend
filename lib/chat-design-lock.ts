// Locked chat design tokens for customer + merchant chat surfaces.
// Keep these values as single source of truth to avoid accidental drift.
export const CHAT_DESIGN_LOCK = Object.freeze({
  threadBackground: "bg-[#efeae2]",
  panelBackground: "bg-[#f0f2f5]",
  ownBubble: "border border-[#ffd7b5] bg-[#ffe8d2] text-[#7a3412]",
  peerBubble: "border border-[#eadfce] bg-white text-slate-700",
} as const)
