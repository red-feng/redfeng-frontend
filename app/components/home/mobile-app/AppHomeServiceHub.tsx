import { appHomeConfig, serviceCards } from "@/app/components/home/shared/homeContent"

export default function AppHomeServiceHub() {
  return (
    <div className="relative z-10 mx-3.5 -mt-[5.55rem] rounded-[32px] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf7_55%,#fcfdff_100%)] px-4 pb-6 pt-[1.65rem] shadow-[0_28px_48px_-32px_rgba(15,23,42,0.16)] ring-1 ring-[#edf1f6]">
      <div className="grid grid-cols-4 gap-x-2 gap-y-[2.15rem]">
        {serviceCards.map((service) => (
          <button key={service.label} type="button" className="flex flex-col items-center rounded-[22px] px-1.5 py-1 text-center">
            <span
              className={`flex h-[3.8rem] w-[3.8rem] items-center justify-center rounded-[18px] text-white shadow-[0_18px_28px_-24px_rgba(15,23,42,0.28)] ${appHomeConfig.serviceAccentByLabel[service.label] ?? "bg-[#164b88]"}`}
            >
              <service.icon className="h-7 w-7" />
            </span>
            <span className="mt-3 max-w-[76px] text-[12px] font-medium leading-4 text-slate-900">{service.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ef5b2a]" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
      </div>
    </div>
  )
}
