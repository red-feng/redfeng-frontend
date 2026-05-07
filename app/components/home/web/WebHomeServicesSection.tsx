import Link from "next/link"
import { serviceCards } from "@/app/components/home/shared/homeContent"
import { servicePageConfigByLabel } from "@/app/components/services/serviceCatalog"

export default function WebHomeServicesSection() {
  return (
    <section className="home-services-section mx-auto max-w-[1240px] px-4 pb-5 pt-2 sm:px-6 md:hidden lg:px-8">
      <div className="home-services-grid grid grid-cols-4 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4 xl:grid-cols-8">
        {serviceCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              href={servicePageConfigByLabel[card.label]?.href || "/packages"}
              className="home-services-card group rounded-[20px] border border-[#dbe5f1] bg-white px-3 py-4 text-center shadow-[0_10px_22px_-26px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-[#cbd8e8] hover:shadow-[0_20px_38px_-24px_rgba(15,23,42,0.14)] lg:rounded-[24px] lg:border-[#d7e2ee] lg:py-6 lg:shadow-[0_14px_30px_-26px_rgba(15,23,42,0.1)]"
              key={card.label}
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
