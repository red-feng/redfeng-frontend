import Link from "next/link"
import { serviceCards } from "@/app/components/home/shared/homeContent"
import { servicePageConfigByLabel } from "@/app/components/services/serviceCatalog"
import type { Locale } from "@/lib/i18n"

export default function WebHomeServicesSection({ locale }: { locale: Locale }) {
  const localizedCards = {
    id: serviceCards,
    en: [
      { ...serviceCards[0], label: "Flights", desc: "Affordable flight tickets" },
      { ...serviceCards[1], label: "Hotels", desc: "Top hotels worldwide" },
      { ...serviceCards[2], label: "Train", desc: "High-speed and regular train" },
      { ...serviceCards[3], label: "Bus", desc: "Complete intercity bus routes" },
      { ...serviceCards[4], label: "Ship", desc: "Official sea ship tickets" },
      { ...serviceCards[5], label: "Cruise", desc: "Cruise sailings and itineraries" },
      { ...serviceCards[6], label: "Activities", desc: "Attraction and experience tickets" },
      { ...serviceCards[7], label: "Tour Packages", desc: "Best holiday packages" },
    ],
    zh: [
      { ...serviceCards[0], label: "机票", desc: "优惠机票选择" },
      { ...serviceCards[1], label: "酒店", desc: "全球优质酒店" },
      { ...serviceCards[2], label: "火车", desc: "高铁与常规列车" },
      { ...serviceCards[3], label: "巴士", desc: "完整城际巴士路线" },
      { ...serviceCards[4], label: "船票", desc: "官方海运船票" },
      { ...serviceCards[5], label: "邮轮", desc: "邮轮航程与行程" },
      { ...serviceCards[6], label: "活动", desc: "景点与体验票券" },
      { ...serviceCards[7], label: "旅游套餐", desc: "精选度假套餐" },
    ],
  }[locale]

  return (
    <section className="home-services-section mx-auto max-w-[1240px] px-4 pb-5 pt-2 sm:px-6 md:hidden lg:px-8">
      <div className="home-services-grid grid grid-cols-4 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4 xl:grid-cols-8">
        {localizedCards.map((card, index) => {
          const Icon = card.icon
          const sourceCard = serviceCards[index]
          return (
            <Link
              href={servicePageConfigByLabel[sourceCard.label]?.href || "/packages"}
              className="home-services-card group rounded-[20px] border border-[#dbe5f1] bg-white px-3 py-4 text-center shadow-[0_10px_22px_-26px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-[#cbd8e8] hover:shadow-[0_20px_38px_-24px_rgba(15,23,42,0.14)] lg:rounded-[24px] lg:border-[#d7e2ee] lg:py-6 lg:shadow-[0_14px_30px_-26px_rgba(15,23,42,0.1)]"
              key={`${sourceCard.label}-${locale}`}
            >
              <div className={`home-services-icon mx-auto flex h-11 w-11 items-center justify-center rounded-[16px] bg-white transition-transform duration-200 group-hover:scale-105 sm:h-14 sm:w-14 lg:h-14 lg:w-14 lg:rounded-[18px] ${card.tone}`}>
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <h3 className="home-services-title mx-auto mt-3 max-w-[86px] text-[12px] font-bold sm:mt-4 sm:text-[16px]">{card.label}</h3>
              <p className="home-services-copy mt-1 hidden text-[12px] leading-5 text-slate-400 lg:block">{card.desc}</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
