import { CardIcon, heroBenefitsByTab } from "@/app/components/home/shared/homeContent"
import type { HeroTabKey } from "@/app/components/home/shared/homeContent"

type HeroBenefitsProps = {
  activeTab: HeroTabKey
}

export default function HeroBenefits({ activeTab }: HeroBenefitsProps) {
  const benefits = heroBenefitsByTab[activeTab]

  return (
    <div className="mt-6 grid grid-cols-2 gap-y-6 border-t border-[#edf1f5] px-1 pt-7 text-sm text-slate-600 sm:grid-cols-4 lg:mt-5 lg:gap-y-0 lg:pt-8">
      {benefits.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.title} className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-[#d8e1eb]">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium leading-5 text-slate-500 lg:text-[12px]">{item.title}</span>
          </div>
        )
      })}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-[#d8e1eb]">
          <CardIcon className="h-4 w-4" />
        </div>
        <span className="text-[11px] font-medium leading-5 text-slate-500 lg:text-[12px]">Pembayaran fleksibel</span>
      </div>
    </div>
  )
}
