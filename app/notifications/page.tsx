import PublicHeader from "@/app/components/PublicHeader"
import { homeLayoutLock } from "@/app/components/home/shared/homeLayoutLock"
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

      <main className={`${homeLayoutLock.pageXClass} pb-8 pt-5 md:pb-10 md:pt-7`}>
        <div className={`${homeLayoutLock.contentWidthClass} space-y-6`}>
          <section className="rounded-[30px] border border-orange-100 bg-[linear-gradient(135deg,#fff8ef_0%,#ffffff_44%,#fff3e3_100%)] p-5 shadow-[0_24px_70px_-42px_rgba(249,115,22,0.38)] sm:p-6 lg:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">Notifications</p>
            <h1 className="mt-3 max-w-3xl text-[28px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[36px]">
              Semua update penting RedFeng dalam satu halaman.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Ikon lonceng di website sekarang mengarah ke halaman ini, jadi promo, pembaruan layanan, dan informasi penting RedFeng bisa dibaca dalam satu alur yang lebih rapi.
            </p>
          </section>

          <NotificationsPageClient items={defaultNotificationItems} />
        </div>
      </main>

      <PublicMobileNav locale={locale} notificationDefaults={defaultNotificationItems} />
    </div>
  )
}
