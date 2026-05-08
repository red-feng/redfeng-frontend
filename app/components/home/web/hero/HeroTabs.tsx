import type { HeroTabKey } from "@/app/components/home/shared/homeContent"
import { heroTabs } from "@/app/components/home/shared/homeContent"

type HeroTabsProps = {
  activeTab: HeroTabKey
  onChange: (tab: HeroTabKey) => void
}

export default function HeroTabs({ activeTab, onChange }: HeroTabsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto border-b border-slate-200/80 px-5 py-4 text-sm font-medium text-slate-700 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:gap-5 lg:px-6 lg:py-6">
      {heroTabs.map((tab) => {
        const Icon = tab.icon
        const isActive = tab.key === activeTab

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[12px] transition lg:border-b-2 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-0 lg:py-2.5 lg:text-[14px] ${
              isActive
                ? "border-[#ef3b2d] bg-[#fff4f1] text-[#ef3b2d] lg:bg-transparent"
                : "border-transparent bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            }`}
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
