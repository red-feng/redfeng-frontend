import Link from "next/link"
import { getCommerceChatUnreadBadgeCount } from "@/lib/commerce-chat"
import { formatCustomerCode } from "@/lib/merchant-code"
import { normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export default async function CustomerAccountHubPage() {
  const supabase = await createClient("customer")
  const adminSupabase = createAdminClient()
  const locale = normalizeLocale(await getCurrentLocale())
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const customerCode = user ? formatCustomerCode(user.id) : "-"
  const commerceChatUnreadCount = user ? await getCommerceChatUnreadBadgeCount(adminSupabase, user.id) : 0

  const copy = {
    id: {
      eyebrow: "Akun Customer",
      title: "Kelola akun RedFeng Anda",
      body: "Area ini dibuat sebagai hub seperti aplikasi travel: semua pengaturan akun, bahasa, dan aktivitas utama customer bisa diakses dari satu tempat yang rapi.",
      profileLabel: "Profil aktif",
      profileTitle: "Profil & Preferensi",
      profileBody: "Masuk ke pengaturan untuk ubah bahasa, wilayah, dan preferensi akun lainnya.",
      settings: "Bahasa & Wilayah",
      dashboardTitle: "Dashboard Perjalanan",
      dashboardBody: "Pantau booking, pembayaran, pickup, dan progress trip Anda dari satu dashboard customer.",
      dashboard: "Buka dashboard",
      chatTitle: "Chat merchant",
      chatBody: "Lanjutkan inquiry paket dan simpan semua percakapan customer-merchant dalam satu inbox commerce.",
      chat: "Buka chat",
      exploreTitle: "Jelajahi Paket",
      exploreBody: "Cari paket wisata terbaru, trending, dan paket unggulan langsung dari katalog lengkap.",
      explore: "Buka katalog lengkap",
      supportTitle: "Butuh bantuan?",
      supportBody: "Pusat bantuan dan alur dukungan bisa ditambahkan di blok ini saat modul support customer dibuka.",
      supportAction: "Kembali ke situs",
      identity: "Customer ID",
      primaryMenu: "Menu utama",
      secondaryMenu: "Akun & preferensi",
      quickHint: "Buka cepat",
    },
    en: {
      eyebrow: "Customer Account",
      title: "Manage your RedFeng account",
      body: "This area acts as a travel-app style hub: account settings, language, and key customer actions are organized in one place.",
      profileLabel: "Active profile",
      profileTitle: "Profile & Preferences",
      profileBody: "Open settings to change language, region, and future account preferences.",
      settings: "Language & Region",
      dashboardTitle: "Booking Dashboard",
      dashboardBody: "Track bookings, payments, pickup progress, and trip activity.",
      dashboard: "Open dashboard",
      chatTitle: "Merchant chat",
      chatBody: "Continue package inquiries and keep customer-merchant conversations in one commerce inbox.",
      chat: "Open chat",
      exploreTitle: "Explore Packages",
      exploreBody: "Browse the latest, trending, and featured travel packages directly from the full catalog.",
      explore: "Open full catalog",
      supportTitle: "Need help?",
      supportBody: "Help center and support actions can be expanded here when the customer support module is ready.",
      supportAction: "Back to site",
      identity: "Customer ID",
      primaryMenu: "Main menu",
      secondaryMenu: "Account & preferences",
      quickHint: "Quick access",
    },
    zh: {
      eyebrow: "客户账户",
      title: "管理您的 RedFeng 账户",
      body: "这里会像旅行 App 一样作为统一入口：账户设置、语言、聊天和客户常用操作都集中在一个清晰的位置。",
      profileLabel: "当前资料",
      profileTitle: "资料与偏好",
      profileBody: "进入设置即可修改语言、地区以及后续更多账户偏好。",
      settings: "语言与地区",
      dashboardTitle: "订单仪表板",
      dashboardBody: "查看订单、付款、接送进度和旅行状态。",
      dashboard: "打开仪表板",
      exploreTitle: "探索套餐",
      exploreBody: "直接从完整目录浏览最新、热门和精选旅游套餐。",
      explore: "打开完整目录",
      chatTitle: "客户聊天",
      chatBody: "从咨询到下单，继续在同一个聊天房间与商家沟通。",
      chat: "打开聊天",
      supportTitle: "需要帮助？",
      supportBody: "帮助中心和客户支持入口后续也可以继续补到这里。",
      supportAction: "返回网站",
      identity: "客户编号",
      primaryMenu: "主菜单",
      secondaryMenu: "账户与偏好",
      quickHint: "快捷入口",
    },
  }[locale]

  const primaryItems = [
    {
      title: copy.dashboardTitle,
      body: copy.dashboardBody,
      href: "/customer/dashboard",
      action: copy.dashboard,
      tone: "bg-[linear-gradient(135deg,#fff4ec_0%,#fffaf6_100%)]",
      iconTone: "bg-[#fff0e7] text-[#ef5b2a]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M4 19h16" />
          <path d="M7 16V9M12 16V5M17 16v-7" />
        </svg>
      ),
    },
    {
      title: copy.chatTitle,
      body: copy.chatBody,
      href: "/chat",
      action: copy.chat,
      tone: "bg-[linear-gradient(135deg,#fff5ec_0%,#fffef9_100%)]",
      iconTone: "bg-[#fff0e7] text-[#f97316]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M7 10h10M7 14h6" />
          <path d="M6 5h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3v-3H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        </svg>
      ),
    },
    {
      title: copy.exploreTitle,
      body: copy.exploreBody,
      href: "/packages/catalog",
      action: copy.explore,
      tone: "bg-[linear-gradient(135deg,#fff8ef_0%,#fffef7_100%)]",
      iconTone: "bg-[#fff7d6] text-[#ca8a04]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4 4" />
        </svg>
      ),
    },
  ]

  const secondaryItems = [
    {
      title: copy.profileTitle,
      body: copy.profileBody,
      href: "/customer/settings",
      action: copy.settings,
      tone: "bg-[linear-gradient(135deg,#fff7ef_0%,#fffaf6_100%)]",
      iconTone: "bg-[#fff2e8] text-[#ea580c]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19c1.8-3 4.2-4.5 7-4.5S17.2 16 19 19" />
        </svg>
      ),
    },
    {
      title: copy.supportTitle,
      body: copy.supportBody,
      href: "/contact",
      action: copy.supportAction,
      tone: "bg-[linear-gradient(135deg,#f3fff4_0%,#fafff7_100%)]",
      iconTone: "bg-[#eefdf1] text-[#16a34a]",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
          <path d="M12 18h.01M9.09 9a3 3 0 1 1 5.82 1c-.4 1.39-1.77 1.94-2.41 2.57-.44.44-.5.84-.5 1.43" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      ),
    },
  ]

  return (
    <main className="px-4 py-5 sm:px-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_34%,#f97316_68%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_90px_rgba(146,64,14,0.18)] sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-50">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.03em] sm:text-[36px]">{copy.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-orange-50/92 sm:text-base">{copy.body}</p>
            </div>
            <div className="rounded-[28px] border border-white/18 bg-white/10 p-5 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-orange-100/80">{copy.profileLabel}</p>
              <p className="mt-2 text-sm text-orange-50/90">{copy.identity}</p>
              <p className="mt-3 text-2xl font-semibold text-white">{customerCode}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <article className="rounded-[30px] border border-[#f0ddc7] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ef5b2a_0%,#f59e0b_100%)] text-xl font-semibold text-white shadow-[0_18px_40px_-24px_rgba(239,91,42,0.75)]">
                  {customerCode.slice(-2)}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{copy.profileLabel}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{copy.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{copy.identity}: {customerCode}</p>
                </div>
              </div>
            </article>

            <article className="rounded-[30px] border border-[#f0ddc7] bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="flex items-center justify-between gap-3 px-2 py-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{copy.primaryMenu}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{copy.quickHint}</h2>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {primaryItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`flex items-center gap-4 rounded-[24px] border border-[#efe1cf] p-4 transition hover:border-orange-200 hover:shadow-[0_16px_36px_rgba(15,23,42,0.05)] ${item.tone}`}
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${item.iconTone}`}>{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-slate-950">{item.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600">{item.body}</span>
                  </span>
                  {item.href === "/chat" && commerceChatUnreadCount > 0 ? (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold leading-none text-white shadow-[0_6px_14px_rgba(16,185,129,0.28)]">
                      {commerceChatUnreadCount > 9 ? "9+" : commerceChatUnreadCount}
                    </span>
                  ) : null}
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ead8c0] bg-white text-slate-500">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
            </article>
          </div>

          <article className="rounded-[30px] border border-[#f0ddc7] bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="flex items-center justify-between gap-3 px-2 py-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{copy.secondaryMenu}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{copy.profileTitle}</h2>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {secondaryItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`flex items-center gap-4 rounded-[24px] border border-[#efe1cf] p-4 transition hover:border-orange-200 hover:shadow-[0_16px_36px_rgba(15,23,42,0.05)] ${item.tone}`}
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${item.iconTone}`}>{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-slate-950">{item.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600">{item.body}</span>
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ead8c0] bg-white text-slate-500">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}
