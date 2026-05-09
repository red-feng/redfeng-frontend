import type { HeroTabKey } from "@/app/components/home/shared/homeContent"
import { heroTabs } from "@/app/components/home/shared/homeContent"
import type { Locale } from "@/lib/i18n"

type HeroTabsProps = {
  activeTab: HeroTabKey
  onChange: (tab: HeroTabKey) => void
  locale: Locale
}

export default function HeroTabs({ activeTab, onChange, locale }: HeroTabsProps) {
  const labels = {
    id: ["Pesawat", "Hotel", "Kereta", "Bus", "Kapal", "Kapal Pesiar", "Aktivitas", "Paket Wisata"],
    en: ["Flights", "Hotels", "Train", "Bus", "Ship", "Cruise", "Activities", "Tour Packages"],
    zh: ["机票", "酒店", "火车", "巴士", "船票", "邮轮", "活动", "旅游套餐"],
  }[locale]

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-[#edf1f5] px-5 py-4 text-sm font-medium text-slate-700 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:gap-8 lg:px-8 lg:py-[1.65rem]">
      {heroTabs.map((tab, index) => {
        const Icon = tab.icon
        const isActive = tab.key === activeTab

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[12px] transition lg:border-b-[2px] lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-0 lg:py-[0.7rem] lg:text-[14px] ${
              isActive
                ? "border-[#ef3b2d] bg-[#fff4f1] text-[#ef3b2d] lg:bg-transparent"
                : "border-transparent bg-transparent text-[#53657e] hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <Icon className="h-4 w-4 lg:h-[15px] lg:w-[15px]" />
            {labels[index] || tab.label}
            {tab.badge ? <span className="rounded-full bg-[#ff3b30] px-1.5 py-0.5 text-[10px] text-white lg:hidden">{locale === "id" ? "Baru" : locale === "en" ? "New" : "新"}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
