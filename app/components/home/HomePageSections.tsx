import Image from "next/image"
import Link from "next/link"
import {
  ArrowRightIcon,
  bookingTabs,
  CardIconBadge,
  destinations,
  HeartIcon,
  partnerLogos,
  payments,
  popularBookings,
  promoCards,
  serviceCards,
  ShieldCheckIcon,
  StarIcon,
  whyChoose,
} from "@/app/components/home/homeContent"

export function HomeServicesSection() {
  return (
    <section className="mx-auto -mt-1 max-w-[1240px] px-4 pb-4 pt-1 sm:px-6 lg:px-8">
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {serviceCards.map((card) => {
          const Icon = card.icon
          return (
            <article
              key={card.label}
              className={`group rounded-[24px] border border-[#e7edf5] bg-white px-3 py-4 text-center shadow-[0_8px_18px_-24px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-1 hover:border-[#d8e3f0] hover:shadow-[0_18px_36px_-24px_rgba(15,23,42,0.12)] ${card.label === "Paket Wisata" ? "col-span-2 mx-auto w-full max-w-[168px] sm:col-span-1 sm:mx-0 sm:max-w-none" : ""}`}
            >
              <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-[18px] bg-white transition-transform duration-200 group-hover:scale-105 sm:h-14 sm:w-14 ${card.tone}`}>
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <h3 className="mt-3 text-[13px] font-bold sm:mt-4 sm:text-[16px]">{card.label}</h3>
              <p className="mt-1 hidden text-[12px] leading-5 text-slate-400 lg:block">{card.desc}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export function HomePromoSection() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 py-4 sm:px-6 lg:px-8">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr] lg:gap-4">
        {promoCards.map((card, index) => (
          <article
            key={card.title}
            className={`relative overflow-hidden rounded-[20px] px-6 py-5 text-white shadow-[0_24px_50px_-34px_rgba(15,23,42,0.3)] ${
              index === 0
                ? `min-h-[188px] bg-gradient-to-br ${card.gradient} lg:col-span-1 lg:min-h-[218px] lg:px-6 lg:py-6`
                : `min-h-[188px] bg-gradient-to-br ${card.gradient} lg:min-h-[218px] lg:px-6 lg:py-6`
            }`}
          >
            <div className={`absolute inset-0 ${card.imageClass}`} style={{ backgroundImage: `url('${card.image}')` }} />
            <div className={`absolute inset-0 ${card.overlayClass}`} />
            {index > 0 ? (
              <button className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur">
                <HeartIcon className="h-4 w-4" />
              </button>
            ) : null}
            <div className={`relative z-10 ${index === 0 ? "max-w-[215px] lg:max-w-[255px]" : "max-w-[210px] lg:max-w-[235px]"}`}>
              {card.badge ? (
                <span className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.05em] text-[#ff5b4d]">
                  {card.badge}
                </span>
              ) : null}
              <h3 className={`whitespace-pre-line font-bold leading-[1.14] ${index === 0 ? "mt-3 text-[22px] tracking-[-0.05em] lg:mt-6 lg:text-[32px] lg:tracking-[-0.06em]" : "text-[18px] tracking-[-0.04em] lg:text-[26px] lg:tracking-[-0.05em]"}`}>
                {card.title}
              </h3>
              <p className={`text-white/90 ${index === 0 ? "mt-3 lg:mt-5" : "mt-3 lg:mt-4"} text-[13px]`}>{card.eyebrow}</p>
              <p className={`mt-1 font-black tracking-[-0.03em] ${index === 0 ? "text-[18px] lg:text-[22px]" : "text-[16px] sm:text-[18px] lg:text-[20px]"}`}>{card.price}</p>
              <button className="mt-4 rounded-[11px] bg-white px-4 py-2.5 text-[12px] font-bold text-slate-900 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.45)] lg:mt-5">
                {card.cta}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function HomePopularSection() {
  return (
    <>
      <SectionHeader title="Paling Banyak Dipesan" showTabs />
      <section className="mx-auto max-w-[1240px] px-4 pb-4 sm:px-6 lg:px-8">
        <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-5">
          {popularBookings.map((item) => (
            <article key={item.title} className="w-[calc(50vw-8px)] min-w-[calc(50vw-8px)] overflow-hidden rounded-[18px] border border-[#ebedf3] bg-white shadow-[0_20px_42px_-34px_rgba(15,23,42,0.2)] md:w-auto md:min-w-0">
              <div className="relative h-[140px] overflow-hidden md:h-[152px]">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${item.image}')` }} />
                <button className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-slate-700">
                  <HeartIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="p-4">
                <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${item.tone}`}>{item.category}</span>
                <h3 className="mt-3 text-[14px] font-bold tracking-[-0.03em] text-slate-900 md:text-[18px]">{item.title}</h3>
                <p className="mt-1 text-[12px] text-slate-500">{item.subtitle}</p>
                <p className="mt-3 text-[10px] text-slate-400">Mulai dari</p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <p className="text-[14px] font-black text-slate-900 md:text-[18px]">
                    {item.price}
                    {item.suffix ? <span className="ml-1 text-[11px] font-medium text-slate-500">{item.suffix}</span> : null}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                    <StarIcon className="h-3.5 w-3.5 text-[#f5a623]" />
                    {item.rating}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

export function HomeDestinationsSection() {
  return (
    <>
      <SectionHeader title="Destinasi Populer" />
      <section className="mx-auto max-w-[1240px] px-4 pb-6 sm:px-6 lg:px-8">
        <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-6">
          {destinations.map((destination) => (
            <article key={destination.name} className="group relative h-[146px] w-[102px] min-w-[102px] overflow-hidden rounded-[18px] shadow-[0_18px_34px_-28px_rgba(15,23,42,0.3)] sm:h-[160px] sm:w-auto sm:min-w-0">
              <div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${destination.image}')` }} />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.82)_100%)]" />
              <button className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur sm:hidden">
                <HeartIcon className="h-3.5 w-3.5" />
              </button>
              <div className="absolute inset-x-4 bottom-4 text-white">
                <h3 className="text-[15px] font-bold leading-none tracking-[-0.04em] sm:text-[24px]">{destination.name}</h3>
                <p className="mt-1 text-[10px] font-medium text-white/95 sm:text-[12px]">{destination.country}</p>
                <p className="mt-1 hidden text-[11px] text-white/80 sm:block">{destination.teaser}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

export function HomeTrustSection() {
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

export function HomeWhyChooseSection() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-6 sm:px-6 lg:px-8">
      <h2 className="text-[22px] font-black tracking-[-0.04em] text-slate-900 lg:text-[28px]">Mengapa memilih RedFeng?</h2>
      <div className="mt-6 grid gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
        {whyChoose.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.title} className="flex gap-4 rounded-[18px] bg-white/70 p-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#ffe2d6] bg-[#fff8f4] text-[#ff8b5b] lg:h-14 lg:w-14">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-slate-500">{item.body}</p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export function HomeNewsletterSection() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-8 sm:px-6 lg:px-8">
      <div
        className="overflow-hidden rounded-[22px] border border-[#f4ddd5] px-4 py-5 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.2)] lg:px-6 lg:py-6"
        style={{
          backgroundImage:
            "linear-gradient(90deg,rgba(255,245,242,0.98)_0%,rgba(255,250,248,0.94)_42%,rgba(255,239,233,0.88)_100%), url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80')",
        }}
      >
        <div className="relative grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="absolute -right-5 top-2 hidden h-[160px] w-[180px] bg-[url('/home-assets/promo-flight.png')] bg-contain bg-no-repeat opacity-45 sm:block lg:hidden" />
          <div className="relative z-10">
            <h2 className="max-w-[260px] text-[18px] font-black leading-8 tracking-[-0.04em] text-slate-900 lg:max-w-none lg:text-[28px]">Dapatkan promo & info terbaru dari RedFeng!</h2>
            <p className="mt-3 max-w-[250px] text-[13px] leading-6 text-slate-600 lg:max-w-sm">
              Berlangganan newsletter kami dan dapatkan penawaran menarik setiap minggunya.
            </p>
          </div>
          <div className="relative z-10 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="email"
              placeholder="Masukkan email Anda"
              className="h-12 rounded-xl border border-white bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 shadow-[0_12px_26px_-20px_rgba(15,23,42,0.25)]"
            />
            <button className="h-12 rounded-xl bg-[#ef3b2d] px-8 text-sm font-semibold text-white shadow-[0_18px_34px_-22px_rgba(239,59,45,0.7)]">Langganan</button>
          </div>
        </div>
      </div>
    </section>
  )
}

function SectionHeader({ title, showTabs = false }: { title: string; showTabs?: boolean }) {
  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-4 pt-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[22px] font-black tracking-[-0.04em] text-slate-900 lg:text-[28px]">{title}</h2>
            <Link href="/packages" className="inline-flex items-center gap-2 text-sm font-semibold text-[#ff4b3e] lg:hidden">
              Lihat semua
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
          {showTabs ? (
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap">
              {bookingTabs.map((tab, index) => (
                <button
                  key={tab}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${index === 0 ? "border-[#ff5b4d] bg-white text-[#ef3b2d]" : "border-slate-200 bg-white text-slate-500"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Link href="/packages" className="hidden items-center gap-2 text-sm font-semibold text-[#3b82f6] lg:inline-flex">
          Lihat semua
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
