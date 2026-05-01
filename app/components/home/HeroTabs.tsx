import { heroTabs } from "@/app/components/home/homeContent"

export default function HeroTabs() {
  const mobileTabs = [
    { label: "Pesawat", icon: heroTabs[0].icon },
    { label: "Hotel", icon: heroTabs[1].icon },
    { label: "Kereta", icon: heroTabs[2].icon },
    { label: "Lainnya", icon: heroTabs[5].icon },
  ]

  return (
    <div className="grid grid-cols-4 border-b border-slate-200/80 px-3 py-4 text-sm font-semibold text-slate-700 lg:flex lg:gap-2 lg:overflow-x-auto lg:px-5">
      {mobileTabs.map((tab, index) => {
        const Icon = tab.icon
        return (
          <button
            key={tab.label}
            className={`flex shrink-0 flex-col items-center gap-2 border-b-2 px-3 py-2 text-[13px] lg:hidden ${index === 0 ? "border-[#ef3b2d] text-[#ef3b2d]" : "border-transparent text-slate-500"}`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        )
      })}
      {heroTabs.map((tab, index) => {
        const Icon = tab.icon
        return (
          <button
            key={`${tab.label}-desktop`}
            className={`hidden shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm lg:flex ${index === 0 ? "border-[#ef3b2d] text-[#ef3b2d]" : "border-transparent text-slate-500"}`}
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
