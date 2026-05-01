import Image from "next/image"
import { CardIconBadge, partnerLogos, payments, ShieldCheckIcon, StarIcon } from "@/app/components/home/homeContent"

export default function HomeTrustSection() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 rounded-[24px] border border-[#f3e8de] bg-[linear-gradient(135deg,#fffaf6_0%,#fffefc_52%,#fff8f2_100%)] px-5 py-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.18)] lg:grid-cols-[0.95fr_1.4fr_1fr] lg:px-6">
        <div className="border-b border-[#f0e5d6] pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
          <div className="flex items-start gap-4">
            <div className="hidden h-11 w-11 items-center justify-center rounded-full bg-[#fff1ea] text-[#ff8b5b] lg:flex">
              <ShieldCheckIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold leading-5 lg:text-[15px]">Dipercaya lebih dari 50.000+ Traveler</h3>
              <div className="mt-4 flex gap-1 text-[#f5a623]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <StarIcon key={index} className="h-4 w-4" />
                ))}
              </div>
              <p className="mt-3 text-[22px] font-black text-slate-900 lg:text-[26px]">
                4.9/5 <span className="block text-[12px] font-medium text-slate-500 lg:inline">dari 20.000+ ulasan</span>
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-[#f0e5d6] pb-5 lg:border-b-0 lg:border-r lg:px-6 lg:pb-0">
          <h3 className="text-[13px] font-bold lg:text-[15px]">Partner Resmi Kami</h3>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-4 text-center lg:gap-x-6">
            {partnerLogos.map((logo, index) =>
              logo.kind === "image" ? (
                <Image
                  key={logo.alt}
                  src={logo.src}
                  alt={logo.alt}
                  width={220}
                  height={60}
                  className="h-6 w-auto object-contain lg:h-8"
                />
              ) : (
                <span
                  key={logo.label}
                  className={`text-[22px] italic tracking-[-0.04em] ${
                    index === 1 || index === 4
                      ? "font-black text-[#ef3b2d]"
                      : index === 2
                        ? "font-black text-[#38a169]"
                        : index === 3
                          ? "font-black text-[#ef3b2d]"
                          : "font-medium text-[#4c51bf]"
                  }`}
                >
                  {logo.label}
                </span>
              ),
            )}
          </div>
        </div>

        <div className="lg:pl-6">
          <h3 className="flex items-center gap-2 text-[13px] font-bold lg:text-[15px]">
            <CardIconBadge className="hidden h-5 w-5 text-[#ff8b5b] lg:block" />
            Pembayaran Aman & Terpercaya
          </h3>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {payments.map((payment) => (
              <span
                key={payment}
                className="inline-flex h-8 items-center justify-center rounded-md bg-white px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-700 ring-1 ring-slate-200 lg:px-3 lg:text-[11px]"
              >
                {payment}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
