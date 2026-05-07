import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import { destinationCatalog, popularBookingCatalog } from "@/app/components/home/shared/homeDetailCatalog"
import { promoCatalog } from "@/app/components/promo/promoCatalog"
import { getCurrentLocale } from "@/lib/locale"

export const dynamic = "force-dynamic"

export default async function WishlistPage() {
  const locale = await getCurrentLocale()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicHeader locale={locale} />

      <main className="px-4 pb-8 pt-5 sm:px-6 md:px-8 md:pb-10 md:pt-7">
        <div className="mx-auto max-w-[1360px] space-y-6">
          <section className="rounded-[30px] border border-orange-100 bg-[linear-gradient(135deg,#fff8ef_0%,#ffffff_44%,#fff3e3_100%)] p-5 shadow-[0_24px_70px_-42px_rgba(249,115,22,0.38)] sm:p-6 lg:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">Wishlist / Favorite</p>
            <h1 className="mt-3 max-w-3xl text-[28px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[36px]">
              Simpan pilihan favorit Anda dalam satu halaman.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Versi awal ini menjadi tujuan resmi untuk semua ikon heart di aplikasi dan website. Tahap berikutnya bisa kita sambungkan ke akun login agar favorit benar-benar tersimpan per user.
            </p>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <article className="rounded-[28px] border border-[#f0ddc7] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Promo favorit</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">Simpan promo yang ingin Anda pantau lebih dulu sebelum melanjutkan ke detail atau layanan terkait.</p>
              <div className="mt-5 space-y-3">
                {promoCatalog.slice(0, 3).map((item) => (
                  <Link key={item.slug} href={item.detailHref} className="block rounded-[20px] border border-[#eceff4] bg-[#fafcfe] px-4 py-4 transition hover:border-orange-200 hover:bg-orange-50/40">
                    <p className="text-sm font-semibold text-slate-900">{item.title.replace(/\n/g, " ")}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.price}</p>
                  </Link>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-[#f0ddc7] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Popular booking</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">Bookmark pilihan yang paling relevan supaya Anda bisa membandingkan rute, hotel, atau paket lebih cepat.</p>
              <div className="mt-5 space-y-3">
                {popularBookingCatalog.slice(0, 3).map((item) => (
                  <Link key={item.slug} href={item.detailHref} className="block rounded-[20px] border border-[#eceff4] bg-[#fafcfe] px-4 py-4 transition hover:border-orange-200 hover:bg-orange-50/40">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.category} • {item.price}{item.suffix || ""}</p>
                  </Link>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-[#f0ddc7] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Destinasi favorit</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">Simpan destinasi yang ingin Anda buka lagi nanti saat sudah siap mencari promo atau itinerary yang lebih spesifik.</p>
              <div className="mt-5 space-y-3">
                {destinationCatalog.slice(0, 3).map((item) => (
                  <Link key={item.slug} href={item.detailHref} className="block rounded-[20px] border border-[#eceff4] bg-[#fafcfe] px-4 py-4 transition hover:border-orange-200 hover:bg-orange-50/40">
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.country} • {item.teaser}</p>
                  </Link>
                ))}
              </div>
            </article>
          </section>

          <section className="rounded-[28px] border border-[#f0ddc7] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Tahap berikutnya</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Saat kita masuk tahap persistensi akun, halaman ini bisa berubah dari daftar contoh menjadi daftar favorit personal per user lengkap dengan add/remove, sinkronisasi login, dan badge jumlah simpanan.
            </p>
          </section>
        </div>
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}
