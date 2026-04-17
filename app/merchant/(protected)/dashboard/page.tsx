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

function getMerchantOpsCue(
  locale: string,
  counts: {
    pickup: number
    finance: number
    dp: number
    paid: number
  },
) {
  if (counts.pickup > 0) {
    return {
      title:
        locale === "en"
          ? "Pickup checkpoints need attention"
          : locale === "zh"
            ? "è¯·ä¼˜å…ˆå…³æ³¨æŽ¥é€æ£€æŸ¥ç‚¹"
            : "Checkpoint pickup perlu perhatian",
      body:
        locale === "en"
          ? "Focus on Arrived and Go so admin can receive clean handoff-ready bookings."
          : locale === "zh"
            ? "è¯·ä¼˜å…ˆå®Œæˆ Arrived ä¸Ž Goï¼Œè®©ç®¡ç†å‘˜æŽ¥æ”¶å·²å®Œæˆæ£€æŸ¥ç‚¹çš„è®¢å•ã€‚"
            : "Fokus ke Arrived dan Go agar admin menerima booking yang checkpoint-nya sudah lengkap.",
    }
  }

  if (counts.finance > 0) {
    return {
      title:
        locale === "en"
          ? "Admin handoff is now in progress"
          : locale === "zh"
            ? "ç®¡ç†å‘˜ç§»äº¤æµç¨‹æ­£åœ¨è¿›è¡Œ"
            : "Handoff admin sedang berjalan",
      body:
        locale === "en"
          ? "These bookings have finished the merchant side. Admin and finance are now the active owners."
          : locale === "zh"
            ? "è¿™äº›è®¢å•çš„å•†å®¶é˜¶æ®µå·²å®Œæˆï¼Œå½“å‰ç”±ç®¡ç†å‘˜ä¸Žè´¢åŠ¡ç»§ç»­å¤„ç†ã€‚"
            : "Booking pada fase ini sudah selesai dari sisi merchant. Admin dan finance kini menjadi owner aktifnya.",
    }
  }

  if (counts.dp > 0) {
    return {
      title:
        locale === "en"
          ? "Some bookings are still waiting for full payment"
          : locale === "zh"
            ? "éƒ¨åˆ†è®¢å•ä»åœ¨ç­‰å¾…å…¨é¢ä»˜æ¬¾"
            : "Sebagian booking masih menunggu pelunasan",
      body:
        locale === "en"
          ? "Operational checkpoints only start after the booking is fully paid."
          : locale === "zh"
            ? "è¿è¥æ£€æŸ¥ç‚¹åªæœ‰åœ¨è®¢å•å…¨é¢ä»˜æ¬¾åŽæ‰ä¼šå¼€å§‹ã€‚"
            : "Checkpoint operasional baru dimulai setelah booking benar-benar lunas.",
    }
  }

  return {
    title:
      locale === "en"
        ? "Operational phases are in sync"
        : locale === "zh"
          ? "è¿è¥é˜¶æ®µå·²ç»åŒæ­¥"
          : "Fase operasional sudah sinkron",
    body:
      locale === "en"
        ? "Merchant, customer, admin, and finance now follow the same booking checkpoints."
        : locale === "zh"
          ? "商家、客户、管理员与财务现在都遵循同一套 booking checkpoint。"
          : "Merchant, customer, admin, dan finance sekarang membaca checkpoint booking yang sama.",
  }
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

  const [{ data: packagesData }, { data: bookingsData }] = await Promise.all([
    supabase.from("packages").select("id, status").eq("merchant_id", merchant.id),
    supabase
      .from("bookings")
      .select("id, total_amount, payment_status, booking_status, escrow_status, packages!inner(merchant_id)")
      .eq("packages.merchant_id", merchant.id),
  ])

  const reviewsResult = await supabase
    .from("package_reviews")
    .select("rating, packages!inner(merchant_id)")
    .eq("packages.merchant_id", merchant.id)

  const packages = (packagesData as PackageRow[] | null) || []
  const bookings = ((bookingsData as BookingRow[] | null) || []).filter((booking) => isVisiblePaidBooking(booking))
  const reviews = (reviewsResult.data as ReviewRow[] | null) || []

  const totalPackages = packages.length
  const activePackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "approved").length
  const draftPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "draft").length
  const pendingPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length

  const totalBookings = bookings.length
  const paidBookings = bookings.filter((booking) => normalizeStatus(booking.payment_status) === "paid")
  const monthlyRevenue = paidBookings.reduce((sum, booking) => sum + (booking.total_amount ?? 0), 0)
  const pendingPayments = bookings.filter((booking) => normalizeStatus(booking.payment_status) === "pending").length
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / reviews.length).toFixed(1)
      : "-"

  const spotlightCards = [
    { label: t.totalPackages, value: String(totalPackages), note: `${activePackages} ${t.active} â€¢ ${draftPackages} ${t.draft}` },
    { label: t.totalBookings, value: String(totalBookings), note: `${pendingPayments} ${t.awaitingPayment}` },
    { label: t.revenue, value: formatMoney(monthlyRevenue), note: `${paidBookings.length} ${t.paidBookings}` },
    { label: t.rating, value: averageRating, note: `${reviews.length} ${t.customerReviews}` },
  ]

  const merchantToolBadge =
    locale === "en" ? "Merchant Tools" : locale === "zh" ? "å•†å®¶å·¥å…·" : "Merchant Tools"
  const merchantToolTitle =
    locale === "en"
      ? "Merchant operations area"
      : locale === "zh"
        ? "å•†å®¶è¿è¥åŒºåŸŸ"
        : "Area operasional merchant"

  const menuMeta: Record<string, string> = {
    "Kelola Paket": `${activePackages} aktif â€¢ ${pendingPackages} pending review`,
    Pesanan: `${totalBookings} total booking`,
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
        ? "å¿«é€Ÿè¿›å…¥å•†å®¶å„ä¸ªè¿è¥åŒºåŸŸï¼ŒæŒç»­ç®¡ç†å¥—é¤è´¨é‡ã€é¢„è®¢ä¸Žå®¢æˆ·æœåŠ¡ã€‚"
        : "Akses cepat ke seluruh area operasional merchant untuk menjaga kualitas listing, booking, dan layanan customer."
  const businessSnapshotBadge =
    locale === "en" ? "Business Snapshot" : locale === "zh" ? "ä¸šåŠ¡æ¦‚è§ˆ" : "Business Snapshot"
  const recommendedNextMoveLabel =
    locale === "en" ? "Recommended next move" : locale === "zh" ? "ä¸‹ä¸€æ­¥å»ºè®®" : "Recommended next move"
  const missingBrandName =
    locale === "en"
      ? "Merchant has not set a brand name yet"
      : locale === "zh"
        ? "å•†å®¶å°šæœªè®¾ç½®å“ç‰Œåç§°"
        : "Merchant belum memiliki brand name"
  const completeMerchantProfile =
    locale === "en" ? "Complete the merchant profile" : locale === "zh" ? "è¯·å®Œå–„å•†å®¶èµ„æ–™" : "Lengkapi profil merchant"
  const noRatingYet =
    locale === "en" ? "No rating yet" : locale === "zh" ? "æš‚æ— è¯„åˆ†" : "Belum ada rating"
  const dashboardTitleFallback =
    locale === "en" ? "Merchant Dashboard" : locale === "zh" ? "å•†å®¶ä»ªè¡¨ç›˜" : "Merchant Dashboard"
  const merchantMenus = [
    {
      key: "packages",
      label: shellText.nav.packages,
      href: "/merchant/paket",
      note:
        locale === "en"
          ? `${activePackages} active â€¢ ${pendingPackages} pending review`
          : locale === "zh"
            ? `${activePackages} ä¸ªå·²ä¸Šæž¶ â€¢ ${pendingPackages} ä¸ªå¾…å®¡æ ¸`
            : `${activePackages} aktif â€¢ ${pendingPackages} pending review`,
    },
    {
      key: "orders",
      label: shellText.nav.orders,
      href: "/merchant/pesanan",
      note:
        locale === "en"
          ? `${totalBookings} total bookings`
          : locale === "zh"
            ? `${totalBookings} ç¬”è®¢å•`
            : `${totalBookings} total booking`,
    },
    {
      key: "calendar",
      label: locale === "en" ? "Booking Calendar" : locale === "zh" ? "é¢„è®¢æ—¥åŽ†" : "Kalender Booking",
      href: "/merchant/kalender-booking",
      note:
        locale === "en"
          ? "Trip schedules and participant capacity"
          : locale === "zh"
            ? "è¡Œç¨‹æŽ’æœŸä¸Žå‚ä¸Žäººæ•°å®¹é‡"
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
            ? "è¥æ”¶ã€çƒ­é—¨å¥—é¤ä¸Žè½¬åŒ–çŽ‡"
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
            ? "å¯ç”¨ä½™é¢ä¸Žå¾…ç»“ç®—æ¬¾é¡¹"
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
              ? `${reviews.length} æ¡è¯„ä»·`
              : `${reviews.length} ulasan masuk`
          : locale === "en"
            ? "Ratings and customer comments"
            : locale === "zh"
              ? "è¯„åˆ†ä¸Žå®¢æˆ·è¯„è®º"
              : "Rating dan komentar customer",
    },
    {
      key: "profile",
      label: locale === "en" ? "Merchant Profile" : locale === "zh" ? "å•†å®¶èµ„æ–™" : "Profil Merchant",
      href: "/merchant/profil",
      note: merchant.company_name || completeMerchantProfile,
    },
  ]

  const quickSignals = [
    { label: t.pendingPackages, value: String(pendingPackages), tone: "from-amber-500 to-orange-300" },
    { label: t.bookingPaid, value: String(paidBookings.length), tone: "from-emerald-500 to-lime-400" },
  ]

  const operationalNotes = [
    `${t.packageDraftCount}: ${draftPackages}`,
    `${t.pendingPaymentCount}: ${pendingPayments}`,
    reviews.length > 0 ? `${t.customerReviews}: ${reviews.length}` : t.noCustomerReview,
  ]

  const journeyBadges = [
    { label: t.customerDpPaid || t.dpPaid, value: countJourneyPhase(bookings, "dp"), tone: "border-amber-200 bg-amber-50 text-amber-700" },
    { label: t.fullyPaid, value: countJourneyPhase(bookings, "paid"), tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    { label: t.awaitingPickup, value: countJourneyPhase(bookings, "pickup"), tone: "border-sky-200 bg-sky-50 text-sky-700" },
    { label: t.readyForFinance, value: countJourneyPhase(bookings, "finance"), tone: "border-sky-200 bg-sky-50 text-sky-700" },
    { label: t.paidOut, value: countJourneyPhase(bookings, "paid_out"), tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  ]
  const opsCue = getMerchantOpsCue(locale, {
    pickup: countJourneyPhase(bookings, "pickup"),
    finance: countJourneyPhase(bookings, "finance"),
    dp: countJourneyPhase(bookings, "dp"),
    paid: countJourneyPhase(bookings, "paid"),
  })

  const nextMoveTitle =
    pendingPackages > 0
      ? locale === "en"
        ? "Finish the package reviews that are still pending."
        : locale === "zh"
          ? "è¯·å…ˆå®Œæˆä»åœ¨å¾…å®¡æ ¸ä¸­çš„å¥—é¤ã€‚"
          : "Selesaikan review paket yang masih pending."
      : draftPackages > 0
        ? locale === "en"
          ? "Complete your draft packages so they can be submitted."
          : locale === "zh"
            ? "è¯·å…ˆå®Œå–„è‰ç¨¿å¥—é¤ï¼Œå†æäº¤å®¡æ ¸ã€‚"
            : "Lengkapi draft paket agar bisa diajukan."
        : countJourneyPhase(bookings, "pickup") > 0
          ? locale === "en"
            ? "Focus on bookings that are currently waiting for pickup."
            : locale === "zh"
              ? "è¯·ä¼˜å…ˆå¤„ç†å½“å‰ç­‰å¾…æŽ¥é€çš„è®¢å•ã€‚"
              : "Fokus pada booking yang sedang menunggu pickup."
          : locale === "en"
            ? "Focus on booking optimization and customer response speed."
            : locale === "zh"
              ? "è¯·ä¸“æ³¨äºŽä¼˜åŒ–é¢„è®¢è½¬åŒ–ä¸Žå®¢æˆ·å“åº”é€Ÿåº¦ã€‚"
              : "Fokus pada optimasi booking dan respons customer."
  const nextMoveDescription =
    locale === "en"
      ? "Merchants now see the same operational phases used by customers, admin, finance, and invoice verification."
      : locale === "zh"
        ? "å•†å®¶çŽ°åœ¨çœ‹åˆ°çš„è¿è¥é˜¶æ®µï¼Œå·²ä¸Žå®¢æˆ·ã€ç®¡ç†å‘˜ã€è´¢åŠ¡å’Œå‘ç¥¨æ ¸éªŒé¡µé¢ä¿æŒä¸€è‡´ã€‚"
        : "Merchant sekarang melihat fase operasional yang sama persis dengan customer, admin, finance, dan halaman verifikasi invoice."

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_34%,#f97316_68%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_36px_110px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:rounded-[36px] lg:px-12 lg:py-9">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                {t.heroBadge}
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                {merchant.brand_name || merchant.company_name || dashboardTitleFallback}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-orange-50/92 sm:mt-4 sm:text-base sm:leading-8">
                {t.heroDescription}
              </p>
              <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-[18px] border border-white/16 bg-white/10 px-3 py-3 backdrop-blur sm:gap-3 sm:px-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-100/80">
                  Merchant Code
                </span>
                <span className="rounded-full border border-white/18 bg-slate-950/20 px-3 py-1 text-sm font-semibold tracking-[0.24em] text-white">
                  {merchantCode}
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">
                {quickSignals.map((signal) => (
                  <div
                    key={signal.label}
                    className="rounded-[20px] border border-white/18 bg-white/10 p-4 backdrop-blur sm:rounded-[24px] sm:p-5"
                  >
                    <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">{signal.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{signal.value}</p>
                    <div className={`mt-4 h-2 rounded-full bg-gradient-to-r ${signal.tone}`} />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[22px] border border-white/18 bg-slate-950/16 p-5 backdrop-blur sm:rounded-[28px] sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.32em] text-orange-100/80">{t.performanceFocus}</p>
                <p className="mt-4 text-2xl font-semibold text-white sm:text-3xl">{formatMoney(monthlyRevenue)}</p>
                <p className="mt-2 text-sm leading-6 text-orange-50/85 sm:leading-7">
                  {t.revenueDescription}
                </p>
              </div>

              <div className="rounded-[22px] border border-white/18 bg-white/10 p-5 backdrop-blur sm:rounded-[28px] sm:p-6">
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
                      <span className="mt-0.5 text-sm text-amber-200">â—</span>
                      <p className="text-sm leading-7 text-orange-50/90">{note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {spotlightCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[22px] border border-orange-100 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:mt-4 sm:text-4xl">{card.value}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:leading-7">{card.note}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:rounded-[32px] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-700">
                  {merchantToolBadge}
                </span>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                  {merchantToolTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 sm:leading-7">
                  {merchantToolDescription}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 sm:grid-cols-2">
              {merchantMenus.map((menu) => (
                <Link
                  key={menu.label}
                  href={menu.href}
                  className="group rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] p-4 transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_18px_40px_rgba(194,65,12,0.12)] sm:rounded-[26px] sm:p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-slate-950 sm:text-lg">{menu.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600 sm:leading-7">{menu.note}</p>
                    </div>
                    <span className="text-sm text-orange-500 transition group-hover:text-orange-700">â†’</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:rounded-[32px] sm:p-6">
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

            <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fffdfa_0%,#fff6ec_100%)] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:rounded-[32px] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{recommendedNextMoveLabel}</p>
              <p className="mt-4 text-base font-semibold text-slate-950 sm:text-lg">
                {nextMoveTitle}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:leading-7">
                {nextMoveDescription}
              </p>
              <div className="mt-5 rounded-[20px] border border-orange-200 bg-orange-50 px-4 py-4 text-sm leading-7 text-orange-800">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-700">{opsCue.title}</p>
                <p className="mt-2">{opsCue.body}</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

