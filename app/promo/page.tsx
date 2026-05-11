import type { Metadata } from "next"
import Link from "next/link"

import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PublicHeader from "@/app/components/PublicHeader"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import { promoCatalog } from "@/app/components/promo/promoCatalog"
import { getCurrentLocale } from "@/lib/locale"

export const metadata: Metadata = {
  title: "Promo | Red Feng",
  description: "Promo aktif Red Feng untuk tiket, hotel, kereta, dan paket wisata, termasuk akses ke landing paket dan katalog penuh.",
  alternates: {
    canonical: "/promo",
  },
}

export default async function PromoPage() {
  const locale = await getCurrentLocale()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicHeader locale={locale} />

      <main className={`${homeLayoutLock.pageXClass} pb-8 pt-5 md:pb-10 md:pt-7`}>
        <div className={homeLayoutLock.contentWidthClass}>
          <section className={`${homeLayoutLock.cardRadiusClass} border border-orange-100 bg-[linear-gradient(135deg,#fff8ef_0%,#ffffff_44%,#fff3e3_100%)] p-5 shadow-[0_24px_70px_-42px_rgba(249,115,22,0.38)] sm:p-6 lg:p-7`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">Promo aktif</p>
            <h1 className="mt-3 max-w-3xl text-[28px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[36px]">
              Semua promo RedFeng dalam satu halaman.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Lihat promo tiket, hotel, paket wisata, dan penawaran terbatas yang sedang ditampilkan di website maupun aplikasi. Untuk
              paket wisata, alurnya sekarang bisa masuk ke landing paket lebih dulu lalu lanjut ke katalog penuh sesuai konteks promo.
            </p>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {promoCatalog.map((card) => (
              <article
                key={card.title}
                className="group relative flex min-h-[320px] flex-col overflow-hidden rounded-[28px] px-5 py-5 text-white shadow-[0_24px_52px_-30px_rgba(15,23,42,0.34)]"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
                <div
                  className={`absolute inset-0 bg-no-repeat transition-transform duration-500 group-hover:scale-[1.03] ${card.imageClass}`}
                  style={{ backgroundImage: `url('${card.image}')` }}
                />
                <div className={`absolute inset-0 ${card.overlayClass}`} />
                <div className={`absolute inset-0 ${card.glowClass}`} />
                <div className="absolute inset-x-0 bottom-0 h-[52%] bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.14)_46%,rgba(15,23,42,0.34)_100%)]" />

                <div className="relative z-10 flex h-full flex-col">
                  {card.badge ? (
                    <span className="inline-flex w-fit rounded-full bg-white px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ff5b4d] shadow-[0_10px_22px_-18px_rgba(255,255,255,0.9)]">
                      {card.badge}
                    </span>
                  ) : null}

                  <div className="mt-6 max-w-[210px]">
                    <h2 className="whitespace-pre-line text-[22px] font-bold leading-[1.08] tracking-[-0.04em]">
                      {card.title}
                    </h2>
                  </div>

                  <div className="mt-auto">
                    <p className="text-[12px] font-medium leading-none text-white/88">{card.eyebrow}</p>
                    <p className="mt-2 text-[24px] font-bold leading-none tracking-[-0.04em]">{card.price}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={card.detailHref}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-[13px] font-semibold text-slate-950 shadow-[0_18px_30px_-22px_rgba(15,23,42,0.4)]"
                      >
                        Lihat detail
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </Link>
                      <Link
                        href={card.targetHref}
                        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-[13px] font-semibold text-white backdrop-blur-sm"
                      >
                        {card.cta}
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}
