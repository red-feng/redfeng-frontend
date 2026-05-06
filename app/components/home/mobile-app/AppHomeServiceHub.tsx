import { appHomeConfig, serviceCards } from "@/app/components/home/shared/homeContent"

export default function AppHomeServiceHub() {
  return (
    <div className="mx-3.5 -mt-7 rounded-[32px] bg-white px-4 pb-6 pt-6 shadow-[0_24px_44px_-32px_rgba(15,23,42,0.18)] ring-1 ring-[#edf1f6]">
      <div className="grid grid-cols-4 gap-x-2 gap-y-7">
        {serviceCards.map((service) => (
          <button key={service.label} type="button" className="flex flex-col items-center rounded-[22px] px-1.5 py-1 text-center">
            <span
              className={`flex h-[3.65rem] w-[3.65rem] items-center justify-center rounded-[18px] text-white shadow-[0_18px_28px_-24px_rgba(15,23,42,0.28)] ${appHomeConfig.serviceAccentByLabel[service.label] ?? "bg-[#164b88]"}`}
            >
              <service.icon className="h-7 w-7" />
            </span>
            <span className="mt-3 max-w-[76px] text-[12px] font-medium leading-4 text-slate-900">{service.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#19a6f4]" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
      </div>
    </div>
  )
}
