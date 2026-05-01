import { heroTabs } from "@/app/components/home/homeContent"

export default function HeroTabs() {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-slate-200/80 px-4 py-4 text-sm font-semibold text-slate-700 sm:px-5">
      {heroTabs.map((tab, index) => {
        const Icon = tab.icon
        return (
          <button
            key={tab.label}
            className={`flex shrink-0 flex-col items-center gap-2 border-b-2 px-3 py-2 text-[13px] lg:flex-row lg:text-sm ${index > 3 ? "hidden lg:flex" : ""} ${index === 0 ? "border-[#ef3b2d] text-[#ef3b2d]" : "border-transparent text-slate-500"}`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            {tab.badge ? <span className="rounded-full bg-[#ff3b30] px-1.5 py-0.5 text-[10px] text-white">Baru</span> : null}
          </button>
        )
      })}
    </div>
  )
}
