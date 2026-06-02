import type { Metadata } from "next"
import Link from "next/link"

import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
import PublicHeader from "@/app/components/PublicHeader"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import { getCurrentLocale } from "@/lib/locale"
import { getSiteBaseUrl, getSiteHost } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Bantuan & Kontak | Red Feng",
  description: "Hubungi tim Red Feng untuk bantuan akun, booking, promo, dan pertanyaan umum.",
  alternates: {
    canonical: "/contact",
  },
}

const contactCards = [
  {
    label: "Email utama",
    value: "hello@redfeng.co",
    href: "mailto:hello@redfeng.co",
    note: "Untuk pertanyaan umum, promo, dan kebutuhan akun customer.",
  },
  {
    label: "Privacy & data request",
    value: "hello@redfeng.co",
    href: "mailto:hello@redfeng.co?subject=Data%20Request%20RedFeng",
    note: "Gunakan subjek Data Request untuk akses, koreksi, atau penghapusan data.",
  },
  {
    label: "Website utama",
    value: getSiteHost(),
    href: getSiteBaseUrl(),
    note: "Akses informasi perusahaan, produk travel, dan kanal publik RedFeng.",
  },
]

export default async function ContactPage() {
  const locale = await getCurrentLocale()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicHeader locale={locale} />

      <main className={`${homeLayoutLock.pageXClass} pb-8 pt-5 md:pb-10 md:pt-7`}>
        <div className={`${homeLayoutLock.wideContentWidthClass} space-y-6`}>
          <section className="rounded-[30px] border border-orange-100 bg-[linear-gradient(135deg,#fff8ef_0%,#ffffff_44%,#fff3e3_100%)] p-5 shadow-[0_24px_70px_-42px_rgba(249,115,22,0.38)] sm:p-6 lg:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">Hubungi RedFeng</p>
            <h1 className="mt-3 max-w-3xl text-[28px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[36px]">
              Pusat bantuan akun, booking, dan pertanyaan umum dalam satu halaman.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Gunakan kontak di bawah ini untuk bantuan customer, verifikasi informasi, kebutuhan privasi, atau koordinasi umum dengan tim RedFeng.
            </p>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              {contactCards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-[28px] border border-[#ebe4da] bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.16)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                  <p className="mt-3 text-[22px] font-semibold tracking-[-0.03em] text-slate-950">{card.value}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.note}</p>
                  <Link
                    href={card.href}
                    className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#ead8c0] bg-[#fffaf3] px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-orange-200 hover:bg-[#fff4e7]"
                  >
                    Buka
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </Link>
                </article>
              ))}
            </div>

            <aside className="rounded-[28px] border border-[#ebe4da] bg-[linear-gradient(180deg,#fffdfa_0%,#fff7ef_100%)] p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.12)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Jam respons</p>
              <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.03em] text-slate-950">
                Tim customer support aktif setiap hari kerja.
              </h2>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                <p>Senin - Jumat: 09.00 - 18.00 WIB</p>
                <p>Sabtu: 10.00 - 15.00 WIB</p>
                <p>Minggu / hari libur: respons prioritas untuk kasus booking aktif dan kebutuhan mendesak.</p>
              </div>

              <div className="mt-6 rounded-[22px] border border-[#efe1cf] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Quick links</p>
                <div className="mt-4 flex flex-col gap-3">
                  <Link href="/promo" className="text-sm font-semibold text-slate-900 hover:text-orange-600">
                    Lihat promo aktif
                  </Link>
                  <Link href="/customer/bookings" className="text-sm font-semibold text-slate-900 hover:text-orange-600">
                    Buka halaman pesanan
                  </Link>
                  <Link href="/privacy" className="text-sm font-semibold text-slate-900 hover:text-orange-600">
                    Kebijakan privasi
                  </Link>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}
