import PublicHeader from "@/app/components/PublicHeader"
import { defaultNotificationItems } from "@/app/components/notifications/defaultNotifications"
import PublicMobileNav from "@/app/components/PublicMobileNav"
import NotificationsPageClient from "@/app/components/notifications/NotificationsPageClient"
import { getCurrentLocale } from "@/lib/locale"

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

          <NotificationsPageClient items={defaultNotificationItems} />

          <section className="rounded-[28px] border border-[#f0ddc7] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Tahap berikutnya</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Jika kita lanjutkan, halaman ini bisa berkembang menjadi notifikasi sungguhan: unread state, filter kategori, sinkron login, dan feed yang diambil dari event booking, promo, maupun bantuan.
            </p>
          </section>
        </div>
      </main>

      <PublicMobileNav locale={locale} notificationDefaults={defaultNotificationItems} />
    </div>
  )
}
