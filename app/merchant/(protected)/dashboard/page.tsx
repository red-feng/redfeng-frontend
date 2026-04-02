import Link from "next/link"
import { getCurrentLocale } from "@/lib/locale"
import { getMerchantShellText } from "@/lib/merchant-shell-i18n"
import { formatMerchantCode } from "@/lib/merchant-code"
import { createClient } from "@/lib/supabase/server"

type MerchantRow = {
  id: string
  brand_name: string | null
  company_name: string | null
}

type PackageRow = {
  id: string
  status: string | null
}

type BookingRow = {
  id: string
  total_amount: number | null
  payment_status: string | null
  booking_status: string | null
  escrow_status: string | null
}

type ChatRoomRow = {
  last_message_at: string | null
  last_message_sender_id: string | null
  merchant_last_read_at: string | null
}

type ReviewRow = {
  rating: number | null
}

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`
}

function isVisiblePaidBooking(booking: BookingRow) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  return paymentStatus === "paid" || paymentStatus === "dp_paid"
}

function countJourneyPhase(bookings: BookingRow[], phase: "dp" | "paid" | "pickup" | "finance" | "paid_out") {
  return bookings.filter((booking) => {
    const paymentStatus = normalizeStatus(booking.payment_status)
    const bookingStatus = normalizeStatus(booking.booking_status)
    const escrowStatus = normalizeStatus(booking.escrow_status)

    if (phase === "dp") return paymentStatus === "dp_paid"
    if (phase === "paid") return paymentStatus === "paid" && !["awaiting_admin_handoff", "finance_review", "finance_processing", "payout_completed"].includes(bookingStatus)
    if (phase === "pickup") return ["merchant_arrived", "customer_picked_up"].includes(bookingStatus)
    if (phase === "finance") return ["awaiting_admin_handoff", "finance_review", "finance_processing"].includes(bookingStatus) || escrowStatus === "awaiting_admin_handoff"
    if (phase === "paid_out") return bookingStatus === "payout_completed" || escrowStatus === "paid_out"
    return false
  }).length
}

export const dynamic = "force-dynamic"

export default async function MerchantDashboardPage() {
  const supabase = await createClient()
  const locale = await getCurrentLocale()
  const shellText = getMerchantShellText(locale)
  const t = shellText.dashboard
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchantData } = await supabase
    .from("merchants")
    .select("id, brand_name, company_name")
    .eq("user_id", user.id)
    .single()

  const merchant = merchantData as MerchantRow | null
  if (!merchant) return <div className="p-10">{t.merchantMissing}</div>
  const merchantCode = formatMerchantCode(merchant.id)

  const [{ data: packagesData }, { data: bookingsData }, { data: chatRoomsData }] = await Promise.all([
    supabase.from("packages").select("id, status").eq("merchant_id", merchant.id),
    supabase
      .from("bookings")
      .select("id, total_amount, payment_status, booking_status, escrow_status, packages!inner(merchant_id)")
      .eq("packages.merchant_id", merchant.id),
    supabase
      .from("package_chat_rooms")
      .select("last_message_at, last_message_sender_id, merchant_last_read_at")
      .eq("merchant_user_id", user.id),
  ])

  const reviewsResult = await supabase
    .from("package_reviews")
    .select("rating, packages!inner(merchant_id)")
    .eq("packages.merchant_id", merchant.id)

  const packages = (packagesData as PackageRow[] | null) || []
  const bookings = ((bookingsData as BookingRow[] | null) || []).filter((booking) => isVisiblePaidBooking(booking))
  const chatRooms = (chatRoomsData as ChatRoomRow[] | null) || []
  const reviews = (reviewsResult.data as ReviewRow[] | null) || []

  const totalPackages = packages.length
  const activePackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "approved").length
  const draftPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "draft").length
  const pendingPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length

  const totalBookings = bookings.length
  const paidBookings = bookings.filter((booking) => normalizeStatus(booking.payment_status) === "paid")
  const monthlyRevenue = paidBookings.reduce((sum, booking) => sum + (booking.total_amount ?? 0), 0)
  const pendingPayments = bookings.filter((booking) => normalizeStatus(booking.payment_status) === "pending").length
  const unreadChats = chatRooms.filter((room) => {
    if (!room.last_message_sender_id || room.last_message_sender_id === user.id) return false
    if (!room.last_message_at) return false
    if (!room.merchant_last_read_at) return true
    return room.last_message_at > room.merchant_last_read_at
  }).length

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / reviews.length).toFixed(1)
      : "-"

  const spotlightCards = [
    { label: t.totalPackages, value: String(totalPackages), note: `${activePackages} ${t.active} • ${draftPackages} ${t.draft}` },
    { label: t.totalBookings, value: String(totalBookings), note: `${pendingPayments} ${t.awaitingPayment}` },
    { label: t.revenue, value: formatMoney(monthlyRevenue), note: `${paidBookings.length} ${t.paidBookings}` },
    { label: t.rating, value: averageRating, note: `${reviews.length} ${t.customerReviews}` },
  ]

  const merchantToolBadge =
    locale === "en" ? "Merchant Tools" : locale === "zh" ? "商家工具" : "Merchant Tools"
  const merchantToolTitle =
    locale === "en"
      ? "Merchant operations area"
      : locale === "zh"
        ? "商家运营区域"
        : "Area operasional merchant"

  const menuMeta: Record<string, string> = {
    "Kelola Paket": `${activePackages} aktif • ${pendingPackages} pending review`,
    Pesanan: `${totalBookings} total booking`,
    "Chat Customer": unreadChats > 0 ? `${unreadChats} chat baru` : "Inbox customer",
    "Kalender Booking": "Jadwal trip dan kapasitas peserta",
    Statistik: "Revenue, top paket, conversion",
    "Saldo & Payout": "Saldo tersedia dan pending payout",
    Review: reviews.length > 0 ? `${reviews.length} ulasan masuk` : "Rating dan komentar customer",
    "Profil Merchant": merchant.company_name || "Profil bisnis merchant",
  }
  void menuMeta

  const merchantToolDescription =
    locale === "en"
      ? "Quick access to every merchant operations area for listing quality, bookings, and customer service."
      : locale === "zh"
        ? "快速进入商家各个运营区域，持续管理套餐质量、预订与客户服务。"
        : "Akses cepat ke seluruh area operasional merchant untuk menjaga kualitas listing, booking, dan layanan customer."
  const businessSnapshotBadge =
    locale === "en" ? "Business Snapshot" : locale === "zh" ? "业务概览" : "Business Snapshot"
  const recommendedNextMoveLabel =
    locale === "en" ? "Recommended next move" : locale === "zh" ? "下一步建议" : "Recommended next move"
  const missingBrandName =
    locale === "en"
      ? "Merchant has not set a brand name yet"
      : locale === "zh"
        ? "商家尚未设置品牌名称"
        : "Merchant belum memiliki brand name"
  const completeMerchantProfile =
    locale === "en" ? "Complete the merchant profile" : locale === "zh" ? "请完善商家资料" : "Lengkapi profil merchant"
  const noRatingYet =
    locale === "en" ? "No rating yet" : locale === "zh" ? "暂无评分" : "Belum ada rating"
  const dashboardTitleFallback =
    locale === "en" ? "Merchant Dashboard" : locale === "zh" ? "商家仪表盘" : "Merchant Dashboard"
  const merchantMenus = [
    {
      key: "packages",
      label: shellText.nav.packages,
      href: "/merchant/paket",
      note:
        locale === "en"
          ? `${activePackages} active • ${pendingPackages} pending review`
          : locale === "zh"
            ? `${activePackages} 个已上架 • ${pendingPackages} 个待审核`
            : `${activePackages} aktif • ${pendingPackages} pending review`,
    },
    {
      key: "orders",
      label: shellText.nav.orders,
      href: "/merchant/pesanan",
      note:
        locale === "en"
          ? `${totalBookings} total bookings`
          : locale === "zh"
            ? `${totalBookings} 笔订单`
            : `${totalBookings} total booking`,
    },
    {
      key: "chat",
      label: locale === "en" ? "Customer Chat" : locale === "zh" ? "客户聊天" : "Chat Customer",
      href: "/merchant/chat",
      note:
        unreadChats > 0
          ? locale === "en"
            ? `${unreadChats} new chats`
            : locale === "zh"
              ? `${unreadChats} 条新消息`
              : `${unreadChats} chat baru`
          : locale === "en"
            ? "Customer inbox"
            : locale === "zh"
              ? "客户收件箱"
              : "Inbox customer",
    },
    {
      key: "calendar",
      label: locale === "en" ? "Booking Calendar" : locale === "zh" ? "预订日历" : "Kalender Booking",
      href: "/merchant/kalender-booking",
      note:
        locale === "en"
          ? "Trip schedules and participant capacity"
          : locale === "zh"
            ? "行程排期与参与人数容量"
            : "Jadwal trip dan kapasitas peserta",
    },
    {
      key: "statistics",
      label: shellText.nav.statistics,
      href: "/merchant/statistik",
      note:
        locale === "en"
          ? "Revenue, top packages, and conversion"
          : locale === "zh"
            ? "营收、热门套餐与转化率"
            : "Revenue, top paket, conversion",
    },
    {
      key: "payout",
      label: shellText.nav.payout,
      href: "/merchant/saldo-payout",
      note:
        locale === "en"
          ? "Available balance and pending payouts"
          : locale === "zh"
            ? "可用余额与待结算款项"
            : "Saldo tersedia dan pending payout",
    },
    {
      key: "review",
      label: shellText.nav.review,
      href: "/merchant/review",
      note:
        reviews.length > 0
          ? locale === "en"
            ? `${reviews.length} incoming reviews`
            : locale === "zh"
              ? `${reviews.length} 条评价`
              : `${reviews.length} ulasan masuk`
          : locale === "en"
            ? "Ratings and customer comments"
            : locale === "zh"
              ? "评分与客户评论"
              : "Rating dan komentar customer",
    },
    {
      key: "profile",
      label: locale === "en" ? "Merchant Profile" : locale === "zh" ? "商家资料" : "Profil Merchant",
      href: "/merchant/profil",
      note: merchant.company_name || completeMerchantProfile,
    },
  ]

  const quickSignals = [
    { label: t.newChats, value: String(unreadChats), tone: "from-orange-500 to-amber-400" },
    { label: t.pendingPackages, value: String(pendingPackages), tone: "from-amber-500 to-orange-300" },
    { label: t.bookingPaid, value: String(paidBookings.length), tone: "from-emerald-500 to-lime-400" },
  ]

  const operationalNotes = [
    `${t.packageDraftCount}: ${draftPackages}`,
    `${t.pendingPaymentCount}: ${pendingPayments}`,
    reviews.length > 0 ? `${t.customerReviews}: ${reviews.length}` : t.noCustomerReview,
  ]

  const journeyBadges = [
    { label: t.customerDpPaid, value: countJourneyPhase(bookings, "dp"), tone: "border-amber-200 bg-amber-50 text-amber-700" },
    { label: t.fullyPaid, value: countJourneyPhase(bookings, "paid"), tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    { label: t.awaitingPickup, value: countJourneyPhase(bookings, "pickup"), tone: "border-sky-200 bg-sky-50 text-sky-700" },
    { label: t.readyForFinance, value: countJourneyPhase(bookings, "finance"), tone: "border-sky-200 bg-sky-50 text-sky-700" },
    { label: t.paidOut, value: countJourneyPhase(bookings, "paid_out"), tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  ]

  const nextMoveTitle =
    pendingPackages > 0
      ? locale === "en"
        ? "Finish the package reviews that are still pending."
        : locale === "zh"
          ? "请先完成仍在待审核中的套餐。"
          : "Selesaikan review paket yang masih pending."
      : draftPackages > 0
        ? locale === "en"
          ? "Complete your draft packages so they can be submitted."
          : locale === "zh"
            ? "请先完善草稿套餐，再提交审核。"
            : "Lengkapi draft paket agar bisa diajukan."
        : countJourneyPhase(bookings, "pickup") > 0
          ? locale === "en"
            ? "Focus on bookings that are currently waiting for pickup."
            : locale === "zh"
              ? "请优先处理当前等待接送的订单。"
              : "Fokus pada booking yang sedang menunggu pickup."
          : locale === "en"
            ? "Focus on booking optimization and customer response speed."
            : locale === "zh"
              ? "请专注于优化预订转化与客户响应速度。"
              : "Fokus pada optimasi booking dan respons customer."
  const nextMoveDescription =
    locale === "en"
      ? "Merchants now see the same operational phases used by customers, admin, finance, and invoice verification."
      : locale === "zh"
        ? "商家现在看到的运营阶段，已与客户、管理员、财务和发票核验页面保持一致。"
        : "Merchant sekarang melihat fase operasional yang sama persis dengan customer, admin, finance, dan halaman verifikasi invoice."

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] px-6 py-8 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[36px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_34%,#f97316_68%,#fdba74_100%)] px-8 py-9 text-white shadow-[0_36px_110px_rgba(146,64,14,0.18)] sm:px-10 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                {t.heroBadge}
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                {merchant.brand_name || merchant.company_name || dashboardTitleFallback}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-orange-50/92">
                {t.heroDescription}
              </p>
              <div className="mt-5 inline-flex flex-wrap items-center gap-3 rounded-[20px] border border-white/16 bg-white/10 px-4 py-3 backdrop-blur">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-100/80">
                  Merchant Code
                </span>
                <span className="rounded-full border border-white/18 bg-slate-950/20 px-3 py-1 text-sm font-semibold tracking-[0.24em] text-white">
                  {merchantCode}
                </span>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {quickSignals.map((signal) => (
                  <div
                    key={signal.label}
                    className={`rounded-[24px] border border-white/18 bg-white/10 p-5 backdrop-blur`}
                  >
                    <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">{signal.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{signal.value}</p>
                    <div className={`mt-4 h-2 rounded-full bg-gradient-to-r ${signal.tone}`} />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] border border-white/18 bg-slate-950/16 p-6 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.32em] text-orange-100/80">{t.performanceFocus}</p>
                <p className="mt-4 text-3xl font-semibold text-white">{formatMoney(monthlyRevenue)}</p>
                <p className="mt-2 text-sm leading-7 text-orange-50/85">
                  {t.revenueDescription}
                </p>
              </div>

              <div className="rounded-[28px] border border-white/18 bg-white/10 p-6 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.32em] text-orange-100/80">{t.operationalNotes}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {journeyBadges.map((item) => (
                    <span key={item.label} className={`inline-flex rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${item.tone}`}>
                      {item.label} {item.value}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  {operationalNotes.map((note) => (
                    <div key={note} className="flex items-start gap-3">
                      <span className="mt-0.5 text-sm text-amber-200">●</span>
                      <p className="text-sm leading-7 text-orange-50/90">{note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {spotlightCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">{card.label}</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{card.value}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{card.note}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-700">
                  {merchantToolBadge}
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                  {merchantToolTitle}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {merchantToolDescription}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {merchantMenus.map((menu) => (
                <Link
                  key={menu.label}
                  href={menu.href}
                  className="group rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] p-5 transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_18px_40px_rgba(194,65,12,0.12)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{menu.label}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{menu.note}</p>
                    </div>
                    {menu.key === "chat" && unreadChats > 0 ? (
                      <span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-semibold text-white">
                        {unreadChats}
                      </span>
                    ) : (
                      <span className="text-sm text-orange-500 transition group-hover:text-orange-700">→</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[32px] border border-orange-100 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-700">
                {businessSnapshotBadge}
              </span>
              <div className="mt-5 space-y-4">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Merchant Code</p>
                  <p className="mt-2 text-sm font-medium tracking-[0.18em] text-slate-900">{merchantCode}</p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Brand</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {merchant.brand_name || merchant.company_name || missingBrandName}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Company</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {merchant.company_name || completeMerchantProfile}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Customer Rating</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {averageRating === "-" ? noRatingYet : `${averageRating} / 5`}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,#fffdfa_0%,#fff6ec_100%)] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{recommendedNextMoveLabel}</p>
              <p className="mt-4 text-lg font-semibold text-slate-950">
                {nextMoveTitle}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {nextMoveDescription}
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
