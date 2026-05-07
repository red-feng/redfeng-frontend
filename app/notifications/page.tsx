import Link from "next/link"
import PublicHeader from "@/app/components/PublicHeader"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import { getCurrentLocale } from "@/lib/locale"

const notificationFeed = [
  {
    title: "Promo baru sudah aktif",
    body: "Pantau promo tiket, hotel, dan paket wisata terbaru yang sekarang sudah sinkron di aplikasi dan website.",
    href: "/promo",
    tag: "Promo",
  },
  {
    title: "Pesanan Anda bisa dipantau dari satu halaman",
    body: "Halaman booking customer sekarang sudah dipisah dari dashboard umum agar progress order lebih mudah dibaca.",
    href: "/customer/bookings",
    tag: "Pesanan",
  },
  {
    title: "Layanan utama kini punya halaman sendiri",
    body: "Pesawat, Hotel, Kereta, Bus, Kapal, Kapal Pesiar, dan Aktivitas sekarang punya landing page lokal yang sama untuk app dan website.",
    href: "/search",
    tag: "Layanan",
  },
  {
    title: "Wishlist awal sudah tersedia",
    body: "Semua ikon heart utama sekarang punya tujuan nyata dan mengarah ke halaman wishlist sebagai fondasi favorit user.",
    href: "/wishlist",
    tag: "Favorite",
  },
] as const

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const locale = await getCurrentLocale()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] pb-36 md:pb-0">
      <PublicHeader locale={locale} />

      <main className="px-4 pb-8 pt-5 sm:px-6 md:px-8 md:pb-10 md:pt-7">
        <div className="mx-auto max-w-[1240px] space-y-6">
          <section className="rounded-[30px] border border-orange-100 bg-[linear-gradient(135deg,#fff8ef_0%,#ffffff_44%,#fff3e3_100%)] p-5 shadow-[0_24px_70px_-42px_rgba(249,115,22,0.38)] sm:p-6 lg:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">Notifications</p>
            <h1 className="mt-3 max-w-3xl text-[28px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[36px]">
              Semua update penting RedFeng dalam satu halaman.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Versi awal ini menjadi tujuan resmi untuk ikon lonceng di website. Tahap berikutnya bisa disambungkan ke notifikasi akun, status booking real-time, dan promo personal per user.
            </p>
          </section>

          <section className="space-y-4">
            {notificationFeed.map((item) => (
              <article
                key={item.title}
                className="rounded-[28px] border border-[#f0ddc7] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <span className="inline-flex rounded-full border border-[#ffe3d8] bg-[#fff4ef] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ef5b2a]">
                      {item.tag}
                    </span>
                    <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.03em] text-slate-950">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
                  </div>
                  <Link
                    href={item.href}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Buka
                  </Link>
                </div>
              </article>
            ))}
          </section>

          <section className="rounded-[28px] border border-[#f0ddc7] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Tahap berikutnya</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Jika kita lanjutkan, halaman ini bisa berkembang menjadi notifikasi sungguhan: unread state, filter kategori, sinkron login, dan feed yang diambil dari event booking, promo, maupun bantuan.
            </p>
          </section>
        </div>
      </main>

      <PublicMobileNav locale={locale} />
    </div>
  )
}
