import Link from "next/link"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { isAdminExecutionRole } from "@/lib/internal-roles"
import { formatBookingCode } from "@/lib/merchant-code"
import { formatPackageMoney } from "@/lib/package-pricing"
import { getEscrowStatusTone, getJourneyStageTone, getPaymentStatusTone, normalizeStatus } from "@/lib/status-tones"
import { handoffBookingToFinance } from "../actions"
import { addBookingAdminNote, reopenBookingAdminNote, resolveBookingAdminNote } from "./actions"

export const dynamic = "force-dynamic"

type BookingDetailRow = {
  id: string
  booking_code: string | null
  customer_name: string | null
  customer_email: string | null
  pickup_date: string | null
  created_at: string | null
  total_amount: number | null
  subtotal_amount: number | null
  customer_admin_fee_amount: number | null
  customer_tax_amount: number | null
  final_payment_amount: number | null
  display_currency: string | null
  display_subtotal_amount: number | null
  display_price_adult: number | null
  display_price_child: number | null
  exchange_rate_date: string | null
  booking_status: string | null
  payment_status: string | null
  package_id: string | null
  escrow_status: string | null
  merchant_arrived_at: string | null
  customer_picked_up_at: string | null
  merchant_picked_up_at: string | null
}

type PackageRow = {
  id: string
  title: string | null
  merchant_id: string | null
  city: string | null
  country: string | null
}

type MerchantRow = {
  id: string
  brand_name: string | null
  company_name: string | null
  email: string | null
  city: string | null
  province: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
}

type PayoutRow = {
  id: string
  status: string | null
  amount: number | null
  gross_booking_amount: number | null
  created_at: string | null
  note: string | null
}

type BookingAdminNoteRow = {
  id: string
  actor_id: string
  note: string
  note_type: string | null
  is_pinned: boolean | null
  is_resolved: boolean | null
  resolved_at: string | null
  resolved_by_id: string | null
  created_at: string | null
}

type ProfileRow = {
  id: string
  username: string | null
  role: string | null
}

type NoteStatusFilter = "all" | "active" | "done"
type NoteTypeFilter = "all" | "general" | "urgent" | "follow_up_merchant" | "follow_up_payment" | "finance_issue"
type NotePinFilter = "all" | "pinned"

function titleCaseStatus(value: string | null) {
  const normalized = normalizeStatus(value)
  if (!normalized) return "-"
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function resolvePaymentStatusLabel(value: string | null) {
  const normalized = normalizeStatus(value)
  if (normalized === "refund_pending_review") return "Refund Ditinjau"
  if (normalized === "dp_paid") return "Customer DP Paid"
  return titleCaseStatus(value)
}

function resolveEscrowStatusLabel(value: string | null) {
  const normalized = normalizeStatus(value)
  if (normalized === "refund_review") return "Refund Review"
  return titleCaseStatus(value)
}

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatMoney(value: number | null | undefined) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

function paymentTone(status: string | null) {
  return getPaymentStatusTone(status, "bordered")
}

function escrowTone(status: string | null) {
  return getEscrowStatusTone(status, "bordered")
}

function journeyPhase(booking: BookingDetailRow) {
  if (normalizeStatus(booking.payment_status) === "refund_pending_review") {
    return { label: "Review refund", tone: getJourneyStageTone("fallback", "bordered") }
  }
  if (normalizeStatus(booking.escrow_status) === "paid_out") {
    return { label: "Sudah dibayar keluar", tone: getJourneyStageTone("paid_out", "bordered") }
  }
  if (normalizeStatus(booking.booking_status) === "finance_review") {
    return { label: "Siap ke finance", tone: getJourneyStageTone("ready_for_finance", "bordered") }
  }
  if (booking.merchant_picked_up_at) {
    return { label: "Go terkonfirmasi", tone: getJourneyStageTone("go_confirmed", "bordered") }
  }
  if (booking.customer_picked_up_at) {
    return { label: "Sudah dijemput", tone: getJourneyStageTone("picked_up", "bordered") }
  }
  if (booking.merchant_arrived_at) {
    return { label: "Menunggu penjemputan", tone: getJourneyStageTone("awaiting_pickup", "bordered") }
  }
  if (normalizeStatus(booking.payment_status) === "paid") {
    return { label: "Lunas", tone: getJourneyStageTone("fully_paid", "bordered") }
  }
  if (normalizeStatus(booking.payment_status) === "dp_paid") {
    return { label: "Customer sudah bayar DP", tone: getJourneyStageTone("dp_paid", "bordered") }
  }
  return { label: titleCaseStatus(booking.booking_status), tone: getJourneyStageTone("fallback", "bordered") }
}

function canHandoffToFinance(booking: BookingDetailRow) {
  return (
    normalizeStatus(booking.payment_status) === "paid" &&
    Boolean(booking.merchant_arrived_at) &&
    Boolean(booking.customer_picked_up_at) &&
    Boolean(booking.merchant_picked_up_at) &&
    !["finance_review", "finance_processing", "payout_completed"].includes(normalizeStatus(booking.booking_status))
  )
}

function isPickupFlowIncomplete(booking: BookingDetailRow) {
  return !booking.merchant_arrived_at || !booking.customer_picked_up_at || !booking.merchant_picked_up_at
}

function isOverduePickup(booking: BookingDetailRow) {
  if (!booking.pickup_date) return false
  const pickupDate = new Date(booking.pickup_date)
  if (Number.isNaN(pickupDate.getTime())) return false
  return pickupDate.getTime() < Date.now() && isPickupFlowIncomplete(booking)
}

function deriveAttentionReasons(booking: BookingDetailRow) {
  const reasons: string[] = []
  if (normalizeStatus(booking.payment_status) === "refund_pending_review") {
    reasons.push("Booking DP melewati batas pelunasan H-3 dan sudah masuk ke review refund finance")
    return reasons
  }
  if (normalizeStatus(booking.payment_status) !== "paid") reasons.push("Pembayaran belum lunas")
  if (normalizeStatus(booking.payment_status) === "paid" && isPickupFlowIncomplete(booking)) {
    reasons.push("Urutan pickup belum lengkap")
  }
  if (isOverduePickup(booking)) reasons.push("Pickup date lewat jadwal")
  if (canHandoffToFinance(booking)) reasons.push("Siap handoff ke finance")
  return reasons
}

function getOperationalOwnerCue(booking: BookingDetailRow, locale: "id" | "en" | "zh") {
  const paymentStatus = normalizeStatus(booking.payment_status)
  const bookingStatus = normalizeStatus(booking.booking_status)
  const escrowStatus = normalizeStatus(booking.escrow_status)
  const copy = {
    id: {
      waitingCustomerLabel: "Menunggu customer",
      waitingCustomerBody: "Checkpoint operasional baru bisa berjalan setelah booking lunas.",
      waitingMerchantArrivedLabel: "Menunggu merchant klik Arrived",
      waitingMerchantArrivedBody: "Merchant perlu konfirmasi sudah tiba di meeting point sebelum customer bisa lanjut Picked up.",
      waitingCustomerPickupLabel: "Menunggu customer klik Picked up",
      waitingCustomerPickupBody: "Customer perlu mengonfirmasi sudah dijemput agar merchant bisa lanjut ke Go.",
      waitingMerchantGoLabel: "Menunggu merchant klik Go",
      waitingMerchantGoBody: "Go akan menutup checkpoint pickup dan memindahkan booking ke fase handoff admin.",
      waitingAdminLabel: "Menunggu admin kirim ke finance",
      waitingAdminBody: "Tiga checkpoint sudah lengkap. Admin operasional sekarang menjadi gerbang berikutnya.",
      financeReviewLabel: "Sedang di review finance",
      financeReviewBody: "Booking sudah diserahkan admin dan menunggu approval payout dari finance manager atau superadmin.",
      financeProcessingLabel: "Sedang diproses finance",
      financeProcessingBody: "Tim finance sedang menjalankan transfer payout ke merchant.",
      payoutDoneLabel: "Payout selesai",
      payoutDoneBody: "Dana merchant sudah ditandai selesai dibayarkan.",
      fallbackLabel: "Pantau status booking",
      fallbackBody: "Gunakan timeline operasional dan status escrow untuk memastikan fase berikutnya jelas.",
    },
    en: {
      waitingCustomerLabel: "Waiting for customer",
      waitingCustomerBody: "Operational checkpoints only begin after the booking is fully paid.",
      waitingMerchantArrivedLabel: "Waiting for merchant to click Arrived",
      waitingMerchantArrivedBody: "The merchant must confirm arrival at the meeting point before the customer can continue to Picked up.",
      waitingCustomerPickupLabel: "Waiting for customer to click Picked up",
      waitingCustomerPickupBody: "The customer needs to confirm pickup so the merchant can continue to Go.",
      waitingMerchantGoLabel: "Waiting for merchant to click Go",
      waitingMerchantGoBody: "Go closes the pickup checkpoint and moves the booking into the admin handoff phase.",
      waitingAdminLabel: "Waiting for admin handoff to finance",
      waitingAdminBody: "All three checkpoints are complete. Operations admin is now the next gate.",
      financeReviewLabel: "Under finance review",
      financeReviewBody: "The booking has been handed off by admin and is waiting for payout approval from finance manager or superadmin.",
      financeProcessingLabel: "Being processed by finance",
      financeProcessingBody: "The finance team is currently executing the merchant payout transfer.",
      payoutDoneLabel: "Payout completed",
      payoutDoneBody: "The merchant payout has already been marked as completed.",
      fallbackLabel: "Monitor booking status",
      fallbackBody: "Use the operational timeline and escrow status to keep the next phase clear.",
    },
    zh: {
      waitingCustomerLabel: "等待客户",
      waitingCustomerBody: "只有在订单全额付款后，运营检查点才会开始。",
      waitingMerchantArrivedLabel: "等待商家点击 Arrived",
      waitingMerchantArrivedBody: "商家需要先确认已到达集合点，客户才能继续点击 Picked up。",
      waitingCustomerPickupLabel: "等待客户点击 Picked up",
      waitingCustomerPickupBody: "客户需要确认已被接走，商家才能继续点击 Go。",
      waitingMerchantGoLabel: "等待商家点击 Go",
      waitingMerchantGoBody: "Go 会结束接送检查点，并把订单带入管理员移交流程。",
      waitingAdminLabel: "等待管理员移交给财务",
      waitingAdminBody: "三个检查点都已完成。运营管理员现在是下一道关口。",
      financeReviewLabel: "财务审核中",
      financeReviewBody: "订单已由管理员移交，目前正在等待 finance manager 或 superadmin 批准 payout。",
      financeProcessingLabel: "财务处理中",
      financeProcessingBody: "财务团队正在执行商家的 payout 转账。",
      payoutDoneLabel: "Payout 已完成",
      payoutDoneBody: "商家的 payout 已经被标记为完成。",
      fallbackLabel: "关注订单状态",
      fallbackBody: "请结合运营时间线与 escrow 状态，明确下一阶段由谁继续处理。",
    },  }[locale]

  if (paymentStatus !== "paid") {
    return {
      label: copy.waitingCustomerLabel,
      body: copy.waitingCustomerBody,
      tone: "border-amber-200 bg-amber-50 text-amber-800",
    }
  }

  if (!booking.merchant_arrived_at) {
    return {
      label: copy.waitingMerchantArrivedLabel,
      body: copy.waitingMerchantArrivedBody,
      tone: "border-sky-200 bg-sky-50 text-sky-800",
    }
  }

  if (!booking.customer_picked_up_at) {
    return {
      label: copy.waitingCustomerPickupLabel,
      body: copy.waitingCustomerPickupBody,
      tone: "border-orange-200 bg-orange-50 text-orange-800",
    }
  }

  if (!booking.merchant_picked_up_at) {
    return {
      label: copy.waitingMerchantGoLabel,
      body: copy.waitingMerchantGoBody,
      tone: "border-violet-200 bg-violet-50 text-violet-800",
    }
  }

  if (bookingStatus === "awaiting_admin_handoff" || escrowStatus === "awaiting_admin_handoff") {
    return {
      label: copy.waitingAdminLabel,
      body: copy.waitingAdminBody,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    }
  }

  if (bookingStatus === "finance_review" || escrowStatus === "finance_review") {
    return {
      label: copy.financeReviewLabel,
      body: copy.financeReviewBody,
      tone: "border-sky-200 bg-sky-50 text-sky-800",
    }
  }

  if (bookingStatus === "finance_processing" || escrowStatus === "payout_processing") {
    return {
      label: copy.financeProcessingLabel,
      body: copy.financeProcessingBody,
      tone: "border-indigo-200 bg-indigo-50 text-indigo-800",
    }
  }

  if (bookingStatus === "payout_completed" || escrowStatus === "paid_out") {
    return {
      label: copy.payoutDoneLabel,
      body: copy.payoutDoneBody,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    }
  }

  return {
    label: copy.fallbackLabel,
    body: copy.fallbackBody,
    tone: "border-slate-200 bg-slate-50 text-slate-700",
  }
}

function noteTypeLabel(value: string | null) {
  const normalized = normalizeStatus(value)
  if (normalized === "urgent") return "Urgent"
  if (normalized === "follow_up_merchant") return "Follow Up Merchant"
  if (normalized === "follow_up_payment") return "Follow Up Payment"
  if (normalized === "finance_issue") return "Finance Issue"
  return "General"
}

function noteTypeTone(value: string | null) {
  const normalized = normalizeStatus(value)
  if (normalized === "urgent") return "border-rose-200 bg-rose-50 text-rose-700"
  if (normalized === "follow_up_merchant") return "border-amber-200 bg-amber-50 text-amber-700"
  if (normalized === "follow_up_payment") return "border-sky-200 bg-sky-50 text-sky-700"
  if (normalized === "finance_issue") return "border-violet-200 bg-violet-50 text-violet-700"
  return "border-slate-200 bg-slate-100 text-slate-700"
}

function normalizeNoteStatusFilter(value: string | null | undefined): NoteStatusFilter {
  const normalized = normalizeStatus(value || null)
  if (normalized === "active" || normalized === "done") return normalized
  return "all"
}

function normalizeNoteTypeFilter(value: string | null | undefined): NoteTypeFilter {
  const normalized = normalizeStatus(value || null)
  if (
    normalized === "general" ||
    normalized === "urgent" ||
    normalized === "follow_up_merchant" ||
    normalized === "follow_up_payment" ||
    normalized === "finance_issue"
  ) {
    return normalized
  }
  return "all"
}

function normalizeNotePinFilter(value: string | null | undefined): NotePinFilter {
  return normalizeStatus(value || null) === "pinned" ? "pinned" : "all"
}

function buildBookingDetailHref(
  bookingId: string,
  filters: {
    noteStatus?: NoteStatusFilter
    noteType?: NoteTypeFilter
    notePin?: NotePinFilter
    success?: string
    error?: string
  },
) {
  const params = new URLSearchParams()

  if (filters.noteStatus && filters.noteStatus !== "all") params.set("note_status", filters.noteStatus)
  if (filters.noteType && filters.noteType !== "all") params.set("note_type", filters.noteType)
  if (filters.notePin && filters.notePin !== "all") params.set("note_pin", filters.notePin)
  if (filters.success) params.set("success", filters.success)
  if (filters.error) params.set("error", filters.error)

  const query = params.toString()
  return query ? `/admin/bookings/${bookingId}?${query}` : `/admin/bookings/${bookingId}`
}

export default async function AdminBookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    success?: string
    error?: string
    note_status?: string
    note_type?: string
    note_pin?: string
  }>
}) {
  const { id } = await params
  const resolvedSearchParams = (await searchParams) || {}
  const adminSupabase = createAdminClient()
  const supabase = await createClient()
  const locale = normalizeLocale(await getCurrentLocale())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null }
  const canExecuteAdminOps = isAdminExecutionRole(currentProfile?.role)

  const { data: booking, error } = await adminSupabase
    .from("bookings")
    .select(
      "id, booking_code, customer_name, customer_email, pickup_date, created_at, total_amount, subtotal_amount, customer_admin_fee_amount, customer_tax_amount, final_payment_amount, display_currency, display_subtotal_amount, display_price_adult, display_price_child, exchange_rate_date, booking_status, payment_status, package_id, escrow_status, merchant_arrived_at, customer_picked_up_at, merchant_picked_up_at",
    )
    .eq("id", id)
    .maybeSingle<BookingDetailRow>()

  if (error || !booking) {
    notFound()
  }

  const { data: pkg } = booking.package_id
    ? await adminSupabase
        .from("packages")
        .select("id, title, merchant_id, city, country")
        .eq("id", booking.package_id)
        .maybeSingle<PackageRow>()
    : { data: null as PackageRow | null }

  const { data: merchant } = pkg?.merchant_id
    ? await adminSupabase
        .from("merchants")
        .select("id, brand_name, company_name, email, city, province, bank_name, bank_account_number, bank_account_holder")
        .eq("id", pkg.merchant_id)
        .maybeSingle<MerchantRow>()
    : { data: null as MerchantRow | null }

  const { data: payout } = await adminSupabase
    .from("payout_requests")
    .select("id, status, amount, gross_booking_amount, created_at, note")
    .eq("booking_id", booking.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<PayoutRow>()

  const { data: adminNotesData } = await adminSupabase
    .from("booking_admin_notes")
    .select("id, actor_id, note, note_type, is_pinned, is_resolved, resolved_at, resolved_by_id, created_at")
    .eq("booking_id", booking.id)
    .order("is_resolved", { ascending: true })
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20)

  const adminNotes = (adminNotesData as BookingAdminNoteRow[] | null) || []
  const noteActorIds = [...new Set(adminNotes.flatMap((item) => [item.actor_id, item.resolved_by_id]).filter(Boolean))] as string[]
  const { data: noteProfilesData } = noteActorIds.length
    ? await adminSupabase.from("profiles").select("id, username, role").in("id", noteActorIds)
    : { data: [] as ProfileRow[] }
  const noteProfileMap = new Map(
    (((noteProfilesData as ProfileRow[] | null) || []) as ProfileRow[]).map((profile) => [
      profile.id,
      {
        username: profile.username || profile.id,
        role: profile.role || "-",
      },
    ]),
  )

  const phase = journeyPhase(booking)
  const ready = canHandoffToFinance(booking)
  const operationalOwnerCue = getOperationalOwnerCue(booking, locale)
  const attentionReasons = deriveAttentionReasons(booking)
  const productLabel = booking.package_id ? "Paket Tour" : "Pesawat"
  const merchantName = merchant?.brand_name || merchant?.company_name || merchant?.id || "-"
  const auditLogHref = `/admin/audit-log?target=booking&q=${encodeURIComponent(booking.id)}`
  const timeline = [
    {
      label: "Merchant Arrived",
      value: booking.merchant_arrived_at,
      done: Boolean(booking.merchant_arrived_at),
    },
    {
      label: "Customer Picked Up",
      value: booking.customer_picked_up_at,
      done: Boolean(booking.customer_picked_up_at),
    },
    {
      label: "Merchant Go",
      value: booking.merchant_picked_up_at,
      done: Boolean(booking.merchant_picked_up_at),
    },
  ]
  const noteStatusFilter = normalizeNoteStatusFilter(resolvedSearchParams.note_status)
  const noteTypeFilter = normalizeNoteTypeFilter(resolvedSearchParams.note_type)
  const notePinFilter = normalizeNotePinFilter(resolvedSearchParams.note_pin)
  const filteredNotes = adminNotes.filter((item) => {
    if (noteStatusFilter === "active" && item.is_resolved) return false
    if (noteStatusFilter === "done" && !item.is_resolved) return false
    if (noteTypeFilter !== "all" && normalizeStatus(item.note_type) !== noteTypeFilter) return false
    if (notePinFilter === "pinned" && !item.is_pinned) return false
    return true
  })
  const activeNotes = filteredNotes.filter((item) => !item.is_resolved)
  const resolvedNotes = filteredNotes.filter((item) => item.is_resolved)
  const totalActiveNotes = adminNotes.filter((item) => !item.is_resolved).length
  const totalResolvedNotes = adminNotes.filter((item) => item.is_resolved).length
  const totalPinnedNotes = adminNotes.filter((item) => item.is_pinned).length
  const noteStatusFilters: Array<{ value: NoteStatusFilter; label: string; count: number }> = [
    { value: "all", label: "Semua", count: adminNotes.length },
    { value: "active", label: "Aktif", count: totalActiveNotes },
    { value: "done", label: "Done", count: totalResolvedNotes },
  ]
  const noteTypeFilters: Array<{ value: NoteTypeFilter; label: string; count: number }> = [
    { value: "all", label: "Semua tag", count: adminNotes.length },
    { value: "general", label: "General", count: adminNotes.filter((item) => normalizeStatus(item.note_type) === "general").length },
    { value: "urgent", label: "Urgent", count: adminNotes.filter((item) => normalizeStatus(item.note_type) === "urgent").length },
    {
      value: "follow_up_merchant",
      label: "Follow Up Merchant",
      count: adminNotes.filter((item) => normalizeStatus(item.note_type) === "follow_up_merchant").length,
    },
    {
      value: "follow_up_payment",
      label: "Follow Up Payment",
      count: adminNotes.filter((item) => normalizeStatus(item.note_type) === "follow_up_payment").length,
    },
    {
      value: "finance_issue",
      label: "Finance Issue",
      count: adminNotes.filter((item) => normalizeStatus(item.note_type) === "finance_issue").length,
    },
  ]
  const notePinFilters: Array<{ value: NotePinFilter; label: string; count: number }> = [
    { value: "all", label: "Semua pin", count: adminNotes.length },
    { value: "pinned", label: "Pinned", count: totalPinnedNotes },
  ]
  const hasActiveNoteFilters = noteStatusFilter !== "all" || noteTypeFilter !== "all" || notePinFilter !== "all"

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        <section className="rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
              <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Booking Detail
              </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">{formatBookingCode(booking.booking_code, booking.id)}</h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Detail lengkap booking untuk investigasi admin, pengecekan auto-queue finance, dan koordinasi ke merchant atau finance.
              </p>
            </div>
            <Link
              href="/admin/bookings"
              className="inline-flex items-center justify-center rounded-[18px] border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Kembali ke Booking Center
            </Link>
          </div>
        </section>

        {resolvedSearchParams.success ? (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {resolvedSearchParams.success}
          </div>
        ) : null}

        {resolvedSearchParams.error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {resolvedSearchParams.error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Produk</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{productLabel}</p>
          </div>
          <div className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Total</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{formatMoney(booking.total_amount)}</p>
          </div>
          <div className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Journey Phase</p>
            <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${phase.tone}`}>
              {phase.label}
            </span>
          </div>
          <div className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Pickup Date</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{formatDate(booking.pickup_date)}</p>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Quick actions</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Pindah cepat ke area terkait booking ini</h2>
          <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Link
              href={auditLogHref}
              className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 transition hover:-translate-y-0.5 hover:border-orange-200"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Audit Log</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">Jejak admin booking ini</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Lihat auto-queue, handoff manual, dan aksi admin yang pernah tercatat.</p>
            </Link>

            {merchant?.id ? (
              <Link
                href={`/admin/merchants/${merchant.id}`}
                className="rounded-[24px] border border-[#efe1cf] bg-white p-5 transition hover:-translate-y-0.5 hover:border-orange-200"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Merchant workspace</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{merchantName}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Masuk ke semua paket dan konteks merchant dari booking ini.</p>
              </Link>
            ) : (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Merchant workspace</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">Belum tersedia</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Merchant belum terhubung atau data package tidak ditemukan.</p>
              </div>
            )}

            {pkg?.id ? (
              <Link
                href={`/admin/packages/${pkg.id}`}
                className="rounded-[24px] border border-[#efe1cf] bg-white p-5 transition hover:-translate-y-0.5 hover:border-orange-200"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Package detail</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{pkg.title || "Package terkait"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Buka detail package untuk validasi harga dan konteks produk.</p>
              </Link>
            ) : (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Package detail</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">Belum tersedia</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Shortcut ini akan aktif saat booking sudah terhubung ke package.</p>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Booking context</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Informasi customer, package, dan merchant</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Customer</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{booking.customer_name || "-"}</p>
                <p className="mt-2 text-sm text-slate-600">{booking.customer_email || "-"}</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Booking dibuat</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{formatDateTime(booking.created_at)}</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Package</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{pkg?.title || "-"}</p>
                <p className="mt-2 text-sm text-slate-600">{[pkg?.city, pkg?.country].filter(Boolean).join(", ") || "-"}</p>
                {pkg?.id ? (
                  <Link href={`/admin/packages/${pkg.id}`} className="mt-3 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700">
                    Buka detail package
                  </Link>
                ) : null}
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Merchant</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{merchantName}</p>
                <p className="mt-2 text-sm text-slate-600">{merchant?.email || "-"}</p>
                <p className="mt-2 text-sm text-slate-600">{[merchant?.city, merchant?.province].filter(Boolean).join(", ") || "-"}</p>
                {merchant?.id ? (
                  <Link href={`/admin/merchants/${merchant.id}`} className="mt-3 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700">
                    Buka workspace merchant
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Finance queue readiness</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Kesiapan ke finance</h2>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
              <span className={`rounded-full border px-3 py-1 ${paymentTone(booking.payment_status)}`}>{resolvePaymentStatusLabel(booking.payment_status)}</span>
              <span className={`rounded-full border px-3 py-1 ${phase.tone}`}>{phase.label}</span>
              <span className={`rounded-full border px-3 py-1 ${escrowTone(booking.escrow_status)}`}>Escrow {resolveEscrowStatusLabel(booking.escrow_status)}</span>
            </div>
            <div className="mt-6 space-y-3">
              {attentionReasons.map((reason) => (
                <div key={reason} className="rounded-[18px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-3 text-sm text-slate-700">
                  {reason}
                </div>
              ))}
              {!attentionReasons.length ? (
                <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Booking ini bersih dari blocker utama.
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {canExecuteAdminOps ? (
                <form action={handoffBookingToFinance}>
                  <input type="hidden" name="booking_id" value={booking.id} />
                  <button
                    type="submit"
                    disabled={!ready}
                    className="rounded-[20px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Ajukan
                  </button>
                </form>
              ) : (
                <div className="rounded-[20px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                  Operations Manager hanya memonitor readiness dan tidak mengirim handoff langsung.
                </div>
              )}
              {!ready ? (
                <span className="rounded-[20px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                  Queue finance terkunci sampai payment lunas dan urutan pickup lengkap.
                </span>
              ) : null}
            </div>
            {payout ? (
              <div className="mt-6 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Payout request terbaru</p>
                <p className="mt-2 text-sm font-medium text-slate-900">Status: {titleCaseStatus(payout.status)}</p>
                <p className="mt-2 text-sm text-slate-600">Net amount: {formatMoney(payout.amount)}</p>
                <p className="mt-2 text-sm text-slate-600">Gross booking: {formatMoney(payout.gross_booking_amount)}</p>
                <p className="mt-2 text-sm text-slate-600">Dibuat: {formatDateTime(payout.created_at)}</p>
                {payout.note ? <p className="mt-2 text-sm text-slate-600">{payout.note}</p> : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Financial breakdown</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Rincian nominal booking</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[20px] border border-white bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Subtotal Paket</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(booking.subtotal_amount)}</p>
              </div>
              <div className="rounded-[20px] border border-white bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Admin Fee</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(booking.customer_admin_fee_amount)}</p>
              </div>
              <div className="rounded-[20px] border border-white bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Pajak</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(booking.customer_tax_amount)}</p>
              </div>
              <div className="rounded-[20px] border border-white bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Sisa Pelunasan</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatMoney(booking.final_payment_amount)}</p>
              </div>
            </div>

            {(booking.display_currency || booking.display_subtotal_amount || booking.exchange_rate_date) && (
              <div className="mt-6 rounded-[24px] border border-blue-100 bg-blue-50 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-600">Display pricing</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[18px] border border-blue-100 bg-white p-4">
                    <p className="text-sm text-slate-500">Harga Dewasa</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatPackageMoney(booking.display_price_adult, booking.display_currency, locale)}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-blue-100 bg-white p-4">
                    <p className="text-sm text-slate-500">Harga Anak</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatPackageMoney(booking.display_price_child, booking.display_currency, locale)}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-blue-100 bg-white p-4">
                    <p className="text-sm text-slate-500">Subtotal Display</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatPackageMoney(booking.display_subtotal_amount, booking.display_currency, locale)}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-blue-100 bg-white p-4">
                    <p className="text-sm text-slate-500">Tanggal Kurs</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{booking.exchange_rate_date || "-"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Operational timeline</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Progress meeting point</h2>
            <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3">
              {timeline.map((item) => (
                <div key={item.label} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className={`mt-2 text-xs font-semibold ${item.done ? "text-emerald-600" : "text-slate-500"}`}>
                    {item.done ? "Selesai" : "Menunggu"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.value)}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[22px] border border-slate-200 bg-white p-5">
              <div className={`mb-5 rounded-[18px] border px-4 py-4 text-sm leading-7 ${operationalOwnerCue.tone}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">{operationalOwnerCue.label}</p>
                <p className="mt-2">{operationalOwnerCue.body}</p>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Merchant payout destination</p>
              <p className="mt-2 text-sm text-slate-700">Bank: {merchant?.bank_name || "-"}</p>
              <p className="mt-2 text-sm text-slate-700">No. Rekening: {merchant?.bank_account_number || "-"}</p>
              <p className="mt-2 text-sm text-slate-700">Atas Nama: {merchant?.bank_account_holder || "-"}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Internal notes</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Tambahkan catatan operasional admin</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Catatan ini hanya untuk tim internal dan tidak tampil ke customer atau merchant.
            </p>
            {canExecuteAdminOps ? (
              <form action={addBookingAdminNote} className="mt-6 space-y-4">
                <input type="hidden" name="booking_id" value={booking.id} />
                <input type="hidden" name="note_status" value={noteStatusFilter} />
                <input type="hidden" name="note_type_filter" value={noteTypeFilter} />
                <input type="hidden" name="note_pin" value={notePinFilter} />
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div>
                    <label className="text-sm font-semibold text-slate-800">Kategori note</label>
                    <select
                      name="note_type"
                      defaultValue="general"
                      className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    >
                      <option value="general">General</option>
                      <option value="urgent">Urgent</option>
                      <option value="follow_up_merchant">Follow Up Merchant</option>
                      <option value="follow_up_payment">Follow Up Payment</option>
                      <option value="finance_issue">Finance Issue</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex w-full items-center gap-3 rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                      <input type="checkbox" name="is_pinned" value="true" className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400" />
                      Pin note ini di atas
                    </label>
                  </div>
                </div>
                <textarea
                  name="note"
                  placeholder="Tulis catatan follow up, konteks issue, atau keputusan operasional internal..."
                  required
                  className="min-h-[180px] w-full rounded-[22px] border border-slate-300 bg-white px-4 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
                <button className="inline-flex items-center justify-center rounded-[18px] bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(249,115,22,0.22)] transition hover:bg-orange-600">
                  Simpan catatan internal
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-7 text-sky-700">
                Operations Manager dapat membaca histori note, tetapi penambahan dan perubahan note tetap dijalankan oleh admin operasional.
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Recent notes</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Riwayat catatan internal booking</h2>
            <div className="mt-6 space-y-4 rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Status note</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {noteStatusFilters.map((filter) => {
                    const isActive = noteStatusFilter === filter.value
                    return (
                      <Link
                        key={filter.value}
                        href={buildBookingDetailHref(booking.id, {
                          noteStatus: filter.value,
                          noteType: noteTypeFilter,
                          notePin: notePinFilter,
                        })}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                          isActive
                            ? "border-orange-300 bg-orange-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.18)]"
                            : "border-[#ead8c2] bg-white text-slate-700 hover:border-orange-200 hover:text-orange-700"
                        }`}
                      >
                        {filter.label}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
                          {filter.count}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Tag note</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {noteTypeFilters.map((filter) => {
                    const isActive = noteTypeFilter === filter.value
                    return (
                      <Link
                        key={filter.value}
                        href={buildBookingDetailHref(booking.id, {
                          noteStatus: noteStatusFilter,
                          noteType: filter.value,
                          notePin: notePinFilter,
                        })}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                          isActive
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-[#ead8c2] bg-white text-slate-700 hover:border-orange-200 hover:text-orange-700"
                        }`}
                      >
                        {filter.label}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${isActive ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"}`}>
                          {filter.count}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Pinned</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {notePinFilters.map((filter) => {
                      const isActive = notePinFilter === filter.value
                      return (
                        <Link
                          key={filter.value}
                          href={buildBookingDetailHref(booking.id, {
                            noteStatus: noteStatusFilter,
                            noteType: noteTypeFilter,
                            notePin: filter.value,
                          })}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                            isActive
                              ? "border-amber-300 bg-amber-500 text-white"
                              : "border-[#ead8c2] bg-white text-slate-700 hover:border-orange-200 hover:text-orange-700"
                          }`}
                        >
                          {filter.label}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] ${isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
                            {filter.count}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
                {hasActiveNoteFilters ? (
                  <Link
                    href={buildBookingDetailHref(booking.id, {})}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-orange-200 hover:text-orange-700"
                  >
                    Reset filter note
                  </Link>
                ) : null}
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                Menampilkan {filteredNotes.length} dari {adminNotes.length} note. Aktif {totalActiveNotes}, done {totalResolvedNotes}, pinned {totalPinnedNotes}.
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {!adminNotes.length ? (
                <div className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 text-sm text-slate-600">
                  Belum ada catatan internal untuk booking ini.
                </div>
              ) : !filteredNotes.length ? (
                <div className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 text-sm text-slate-600">
                  Tidak ada note yang cocok dengan filter saat ini.
                </div>
              ) : (
                activeNotes.map((item) => {
                  const actor = noteProfileMap.get(item.actor_id)
                  const resolver = item.resolved_by_id ? noteProfileMap.get(item.resolved_by_id) : null
                  return (
                    <div key={item.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.is_pinned ? (
                          <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-700">
                            Pinned
                          </span>
                        ) : null}
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${noteTypeTone(item.note_type)}`}>
                          {noteTypeLabel(item.note_type)}
                        </span>
                        <span className="inline-flex rounded-full border border-orange-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                          {actor?.username || item.actor_id}
                        </span>
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                          {titleCaseStatus(actor?.role || "-")}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-700">{item.note}</p>
                      <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                      {item.is_resolved ? (
                        <p className="mt-2 text-xs text-emerald-700">
                          Diselesaikan oleh {resolver?.username || item.resolved_by_id || "-"} pada {formatDateTime(item.resolved_at)}
                        </p>
                      ) : null}
                      {!item.is_resolved && canExecuteAdminOps ? (
                        <form action={resolveBookingAdminNote} className="mt-4">
                          <input type="hidden" name="booking_id" value={booking.id} />
                          <input type="hidden" name="note_id" value={item.id} />
                          <input type="hidden" name="note_status" value={noteStatusFilter} />
                          <input type="hidden" name="note_type_filter" value={noteTypeFilter} />
                          <input type="hidden" name="note_pin" value={notePinFilter} />
                          <button className="inline-flex items-center justify-center rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                            Tandai selesai
                          </button>
                        </form>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
            {resolvedNotes.length ? (
              <div className="mt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Resolved notes</p>
                <div className="mt-3 space-y-3">
                  {resolvedNotes.map((item) => {
                    const actor = noteProfileMap.get(item.actor_id)
                    const resolver = item.resolved_by_id ? noteProfileMap.get(item.resolved_by_id) : null
                    return (
                      <div key={`${item.id}-resolved`} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                            Done
                          </span>
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${noteTypeTone(item.note_type)}`}>
                            {noteTypeLabel(item.note_type)}
                          </span>
                          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                            {actor?.username || item.actor_id}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-700">{item.note}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          Dibuat {formatDateTime(item.created_at)} | diselesaikan oleh {resolver?.username || item.resolved_by_id || "-"} pada {formatDateTime(item.resolved_at)}
                        </p>
                        {canExecuteAdminOps ? (
                          <form action={reopenBookingAdminNote} className="mt-4">
                            <input type="hidden" name="booking_id" value={booking.id} />
                            <input type="hidden" name="note_id" value={item.id} />
                            <input type="hidden" name="note_status" value={noteStatusFilter} />
                            <input type="hidden" name="note_type_filter" value={noteTypeFilter} />
                            <input type="hidden" name="note_pin" value={notePinFilter} />
                            <button className="inline-flex items-center justify-center rounded-[16px] border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100">
                              Buka lagi note ini
                            </button>
                          </form>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}

