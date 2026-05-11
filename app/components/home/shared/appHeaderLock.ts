export const appHeaderLock = {
  containerClass:
    "relative overflow-hidden rounded-b-[3.2rem] px-3.5 pb-[8.8rem] pt-[calc(env(safe-area-inset-top)+1rem)] shadow-[0_26px_44px_-34px_rgba(15,23,42,0.24)]",
  actionRowClass: "relative z-10 flex items-center gap-2.5",
  searchTriggerClass:
    "flex h-[3.55rem] min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-full border border-white/80 bg-white/78 px-4.5 text-left text-[#6a879d] shadow-[0_16px_24px_-20px_rgba(15,23,42,0.18)] backdrop-blur-md",
  utilityButtonClass:
    "inline-flex h-10.5 w-10.5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white/76 text-sky-500 shadow-[0_16px_24px_-20px_rgba(15,23,42,0.18)] backdrop-blur-md",
  chipsWrapClass:
    "flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
} as const
