import { appHomeConfig, serviceCards } from "@/app/components/home/homeContent"

export default function AppHomeServiceHub() {
  return (
    <div className="mx-4 -mt-10 rounded-[30px] bg-white px-4 pb-5 pt-6 shadow-[0_20px_44px_-28px_rgba(15,23,42,0.24)]">
      <div className="grid grid-cols-5 gap-x-2 gap-y-7">
        {serviceCards.map((service) => (
          <button key={service.label} type="button" className="flex flex-col items-center text-center">
            <span
              className={`flex h-[3.9rem] w-[3.9rem] items-center justify-center rounded-full text-white shadow-[0_18px_28px_-24px_rgba(15,23,42,0.35)] ${appHomeConfig.serviceAccentByLabel[service.label] ?? "bg-[#164b88]"}`}
            >
              <service.icon className="h-7 w-7" />
            </span>
            <span className="mt-3 text-[11px] font-medium leading-4 text-slate-900">{service.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#19a6f4]" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
      </div>
    </div>
  )
}
