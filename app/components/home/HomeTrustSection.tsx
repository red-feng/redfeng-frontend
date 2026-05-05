import Image from "next/image"
import { CardIconBadge, partnerLogos, payments, ShieldCheckIcon, StarIcon } from "@/app/components/home/homeContent"

export default function HomeTrustSection() {
  return (
    <section className="home-trust-section mx-auto max-w-[1240px] px-4 pb-8 sm:px-6 lg:px-8">
      <div className="home-trust-shell grid grid-cols-3 gap-0 rounded-[24px] border border-[#f3e8de] bg-[linear-gradient(135deg,#fffaf6_0%,#fffefc_52%,#fff8f2_100%)] px-4 py-5 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.18)] lg:px-6">
        <div className="home-trust-rating pr-3 sm:pr-5 lg:pr-6">
          <div className="flex items-start gap-4">
            <div className="hidden h-11 w-11 items-center justify-center rounded-full bg-[#fff1ea] text-[#ff8b5b] lg:flex">
              <ShieldCheckIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[10px] font-semibold leading-5 text-slate-700 lg:text-[15px] lg:font-bold">Dipercaya lebih dari 50.000+ Traveler</h3>
              <div className="mt-4 flex gap-0.5 text-[#f5a623] lg:gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <StarIcon key={index} className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                ))}
              </div>
              <p className="mt-4 text-[13px] font-black text-slate-900 lg:mt-3 lg:text-[22px]">
                4.9/5 <span className="mt-1 block text-[10px] font-medium text-slate-500 lg:inline lg:text-[12px]">dari 20.000+ ulasan</span>
              </p>
            </div>
          </div>
        </div>

        <div className="home-trust-partners border-x border-[#f0e5d6] px-3 sm:px-5 lg:px-6">
          <h3 className="text-center text-[10px] font-semibold text-slate-700 lg:text-left lg:text-[15px] lg:font-bold">Partner Resmi Kami</h3>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-3 text-center lg:justify-start lg:gap-x-6 lg:gap-y-4">
            {partnerLogos.map((logo, index) =>
              logo.kind === "image" ? (
                <Image
                  key={logo.alt}
                  src={logo.src}
                  alt={logo.alt}
                  width={220}
                  height={60}
                  className="h-4 w-auto object-contain lg:h-8"
                />
              ) : (
                <span
                  key={logo.label}
                  className={`text-[12px] italic tracking-[-0.04em] lg:text-[20px] ${
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

        <div className="home-trust-payments pl-3 sm:pl-5 lg:pl-6">
          <h3 className="text-center text-[10px] font-semibold text-slate-700 lg:flex lg:items-center lg:gap-2 lg:text-left lg:text-[15px] lg:font-bold">
            <CardIconBadge className="hidden h-5 w-5 text-[#ff8b5b] lg:block" />
            Pembayaran Aman & Terpercaya
          </h3>
          <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start lg:gap-2.5">
            {payments.map((payment) => (
              <PaymentBadge
                key={payment.label}
                label={payment.label}
                src={payment.src}
                width={payment.width}
                height={payment.height}
                mobileRenderWidth={payment.mobileRenderWidth}
                desktopRenderWidth={payment.desktopRenderWidth}
                mobileScale={payment.mobileScale}
                desktopScale={payment.desktopScale}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function PaymentBadge({
  label,
  src,
  width = 96,
  height = 24,
  mobileRenderWidth = 56,
  desktopRenderWidth = 64,
  mobileScale = 1,
  desktopScale = 1,
}: {
  label: string
  src?: string
  width?: number
  height?: number
  mobileRenderWidth?: number
  desktopRenderWidth?: number
  mobileScale?: number
  desktopScale?: number
}) {
  return (
    <span className="inline-flex h-10 w-[88px] items-center justify-center rounded-[10px] border border-slate-200/90 bg-white px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.04em] text-slate-700 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.28)] lg:h-11 lg:w-[104px] lg:px-3.5 lg:py-1.5 lg:text-[11px] lg:tracking-[0.08em]">
      {src ? (
        <>
          <span className="flex h-3.5 items-center justify-center lg:hidden" style={{ width: `${mobileRenderWidth}px` }}>
            <Image
              src={src}
              alt={label}
              width={width}
              height={height}
              className="h-3.5 w-auto object-contain"
              style={{ transform: `scale(${mobileScale})` }}
            />
          </span>
          <span className="hidden lg:flex lg:h-5 lg:items-center lg:justify-center" style={{ width: `${desktopRenderWidth}px` }}>
            <Image
              src={src}
              alt={label}
              width={width}
              height={height}
              className="h-5 w-auto object-contain"
              style={{ transform: `scale(${desktopScale})` }}
            />
          </span>
        </>
      ) : (
        label
      )}
    </span>
  )
}
