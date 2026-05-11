export const appHeaderLock = {
  containerClass:
    "relative overflow-hidden rounded-b-[56px] px-3.5 pb-[11.5rem] pt-[calc(env(safe-area-inset-top)+1.05rem)] shadow-[0_28px_48px_-32px_rgba(15,23,42,0.26)]",
  actionRowClass: "relative z-10 flex items-center gap-2.5",
  searchTriggerClass:
    "flex h-[3.75rem] min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-full border border-white/75 bg-white/76 px-5 text-left text-[#6a879d] shadow-[0_18px_28px_-22px_rgba(15,23,42,0.2)] backdrop-blur-md",
  utilityButtonClass:
    "inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/75 bg-white/74 text-sky-500 shadow-[0_18px_28px_-22px_rgba(15,23,42,0.2)] backdrop-blur-md",
  chipsWrapClass:
    "flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
} as const
