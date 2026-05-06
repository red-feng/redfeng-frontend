import Link from "next/link"

import { appHomeConfig, serviceCards } from "@/app/components/home/shared/homeContent"

export default function AppHomeServiceHub() {
  return (
    <div className="mx-4 -mt-8 rounded-[28px] bg-white px-4 pb-5 pt-5 shadow-[0_22px_46px_-32px_rgba(15,23,42,0.22)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-500">Layanan utama</p>
          <h2 className="mt-1 text-[17px] font-bold tracking-[-0.03em] text-slate-950">Pilih kebutuhan perjalananmu</h2>
        </div>
        <Link href="/" className="rounded-full bg-[#eef7ff] px-3 py-2 text-[11px] font-semibold text-[#169ef1]">
          Semua
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-x-2 gap-y-5">
        {serviceCards.map((service) => {
          const isWide = service.label === "Paket Wisata"

          return (
            <button
              key={service.label}
              type="button"
              className={`flex flex-col items-center rounded-[22px] px-1.5 py-1 text-center ${isWide ? "col-span-2 items-start text-left" : ""}`}
            >
              <span
                className={`flex h-[3.65rem] w-[3.65rem] items-center justify-center rounded-[18px] text-white shadow-[0_18px_28px_-24px_rgba(15,23,42,0.35)] ${appHomeConfig.serviceAccentByLabel[service.label] ?? "bg-[#164b88]"}`}
              >
                <service.icon className="h-7 w-7" />
              </span>
              <span className={`mt-3 text-[12px] font-semibold leading-4 text-slate-900 ${isWide ? "max-w-[92px]" : ""}`}>{service.label}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#19a6f4]" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
      </div>
    </div>
  )
}
