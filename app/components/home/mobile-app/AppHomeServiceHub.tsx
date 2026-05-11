import Link from "next/link"
import { appHomeConfig, serviceCards } from "@/app/components/home/shared/homeContent"
import { servicePageConfigByLabel } from "@/app/components/services/serviceCatalog"

export default function AppHomeServiceHub() {
  return (
    <section className="relative z-10 mx-3.5 -mt-[7.15rem] pb-4">
      <div className="grid grid-cols-4 gap-3">
        {serviceCards.map((service) => (
          <Link
            key={service.label}
            href={servicePageConfigByLabel[service.label]?.href || "/packages"}
            className="group flex min-h-[8.25rem] flex-col items-center justify-center rounded-[1.7rem] border border-[#dbe6f1] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-2 pb-3.5 pt-3 text-center shadow-[0_18px_30px_-28px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:border-[#cfdae8] hover:shadow-[0_24px_38px_-28px_rgba(15,23,42,0.26)]"
          >
            <span
              className={`flex h-[2.95rem] w-[2.95rem] items-center justify-center rounded-[1rem] text-white shadow-[0_14px_24px_-18px_rgba(15,23,42,0.22)] transition group-hover:scale-[1.03] ${appHomeConfig.serviceAccentByLabel[service.label] ?? "bg-[#164b88]"}`}
            >
              <service.icon className="h-[1.45rem] w-[1.45rem]" />
            </span>
            <span className="mt-3.5 max-w-[76px] text-[11px] font-semibold leading-4 tracking-[-0.01em] text-slate-950">{service.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
