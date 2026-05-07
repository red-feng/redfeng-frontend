import Link from "next/link"
import { appHomeConfig, serviceCards } from "@/app/components/home/shared/homeContent"
import { servicePageConfigByLabel } from "@/app/components/services/serviceCatalog"

export default function AppHomeServiceHub() {
  return (
    <div className="relative z-10 mx-3.5 -mt-[8.35rem] rounded-tl-[2.8rem] rounded-tr-[2.8rem] rounded-bl-[2.3rem] rounded-br-[2.3rem] bg-[linear-gradient(180deg,#ffffff_0%,#fffaf7_55%,#fcfdff_100%)] px-4 pb-6 pt-[2rem] shadow-[0_30px_52px_-34px_rgba(15,23,42,0.16)] ring-1 ring-[#edf1f6]">
      <div className="grid grid-cols-4 gap-x-2 gap-y-[2.15rem]">
        {serviceCards.map((service) => (
          <Link
            key={service.label}
            href={servicePageConfigByLabel[service.label]?.href || "/packages"}
            className="flex flex-col items-center rounded-[22px] px-1.5 py-1 text-center"
          >
            <span
              className={`flex h-[3.8rem] w-[3.8rem] items-center justify-center rounded-[18px] text-white shadow-[0_18px_28px_-24px_rgba(15,23,42,0.28)] ${appHomeConfig.serviceAccentByLabel[service.label] ?? "bg-[#164b88]"}`}
            >
              <service.icon className="h-7 w-7" />
            </span>
            <span className="mt-3 max-w-[76px] text-[12px] font-medium leading-4 text-slate-900">{service.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
