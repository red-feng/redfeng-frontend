export const mobileWebNavLock = {
  navShellClass:
    "public-mobile-nav fixed inset-x-0 bottom-0 z-[80] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 md:hidden",
  shellCardClass:
    "public-mobile-nav-shell mx-auto max-w-[23.5rem] rounded-[26px] border border-[#eef2f7] bg-white/96 px-2 py-1.5 shadow-[0_-20px_42px_-30px_rgba(15,23,42,0.2)] backdrop-blur-xl",
  gridClass: "public-mobile-nav-grid grid grid-cols-4 gap-1",
  itemClass: "public-mobile-nav-item flex flex-col items-center justify-center rounded-[20px] px-2 py-1.5 text-[11px] font-semibold transition",
  iconClass: "public-mobile-nav-icon flex h-9 w-9 items-center justify-center rounded-full transition",
} as const
