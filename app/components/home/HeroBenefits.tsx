import { CardIcon, heroBenefits } from "@/app/components/home/homeContent"

export default function HeroBenefits() {
  return (
    <div className="mt-6 grid grid-cols-4 gap-4 border-t border-slate-200/80 pt-5 text-sm text-slate-600">
      {heroBenefits.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.title} className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium leading-5 text-slate-600">{item.title}</span>
          </div>
        )
      })}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200">
          <CardIcon className="h-4 w-4" />
        </div>
        <span className="text-[11px] font-medium leading-5 text-slate-600">Pembayaran fleksibel</span>
      </div>
    </div>
  )
}
