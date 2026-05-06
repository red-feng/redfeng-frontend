import { CardIcon, heroBenefitsByTab } from "@/app/components/home/shared/homeContent"
import type { HeroTabKey } from "@/app/components/home/shared/homeContent"

type HeroBenefitsProps = {
  activeTab: HeroTabKey
}

export default function HeroBenefits({ activeTab }: HeroBenefitsProps) {
  const benefits = heroBenefitsByTab[activeTab]

  return (
    <div className="mt-6 grid grid-cols-4 gap-3 border-t border-slate-200/80 pt-5 text-sm text-slate-600">
      {benefits.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.title} className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-medium leading-5 text-slate-600 lg:text-[11px]">{item.title}</span>
          </div>
        )
      })}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200">
          <CardIcon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-medium leading-5 text-slate-600 lg:text-[11px]">Pembayaran fleksibel</span>
      </div>
    </div>
  )
}
