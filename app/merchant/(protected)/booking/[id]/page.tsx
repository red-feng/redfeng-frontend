import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentLocale } from "@/lib/locale"
import { type Locale, normalizeLocale } from "@/lib/i18n"
import { getPaymentStatusTone, normalizeStatus } from "@/lib/status-tones"

export const dynamic = "force-dynamic"

type MerchantBookingPageProps = {
  params: Promise<{ id: string }>
}

type BookingRow = {
  id: string
  booking_code: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  pickup_date: string | null
  adult_count: number | null
  child_count: number | null
  payment_status: string | null
  booking_status: string | null
  payment_type: string | null
  total_amount: number | null
  dp_amount: number | null
  final_payment_amount: number | null
  package_id: string | null
}

type ChatRoomRow = {
  id: string
}

function titleCaseStatus(value: string | null) {
  const normalized = normalizeStatus(value)
  if (!normalized) return "-"
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatIdr(value: number | null | undefined) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

function getText(locale: Locale) {
  const dict = {
    id: {
      title: "Detail booking customer",
      subtitle:
        "Halaman ini untuk merchant melihat ringkasan booking yang terhubung dari chat customer.",
      bookingNotFound: "Booking tidak ditemukan atau tidak termasuk merchant Anda.",
      bookingCode: "Kode Booking",
      packageLabel: "Paket",
      customer: "Customer",
      phone: "Telepon",
      tripDate: "Tanggal wisata",
      participantCount: "Jumlah peserta",
      paymentType: "Jenis pembayaran",
      paymentStatus: "Status pembayaran",
      bookingStatus: "Status booking",
      total: "Total",
      dpAmount: "DP",
      finalPayment: "Sisa pelunasan",
      openChat: "Chat customer",
      backToOrders: "Kembali ke pesanan",
      fullPayment: "Full payment",
      dpPayment: "DP 30%",
    },
    en: {
      title: "Customer booking detail",
      subtitle: "This page helps merchants review booking summaries linked from customer chat.",
      bookingNotFound: "Booking was not found or does not belong to your merchant account.",
      bookingCode: "Booking Code",
      packageLabel: "Package",
      customer: "Customer",
      phone: "Phone",
      tripDate: "Trip date",
      participantCount: "Participants",
      paymentType: "Payment type",
      paymentStatus: "Payment status",
      bookingStatus: "Booking status",
      total: "Total",
      dpAmount: "Down payment",
      finalPayment: "Remaining final payment",
      openChat: "Chat customer",
      backToOrders: "Back to orders",
      fullPayment: "Full payment",
      dpPayment: "DP 30%",
    },
    zh: {
      title: "客户订单详情",
      subtitle: "该页面用于商家查看来自客户聊天的订单摘要。",
      bookingNotFound: "未找到该订单，或该订单不属于当前商家账号。",
      bookingCode: "订单编号",
      packageLabel: "套餐",
      customer: "客户",
      phone: "电话",
      tripDate: "出游日期",
      participantCount: "参与人数",
      paymentType: "付款方式",
      paymentStatus: "付款状态",
      bookingStatus: "订单状态",
      total: "总额",
      dpAmount: "定金",
      finalPayment: "尾款",
      openChat: "联系客户",
      backToOrders: "返回订单",
      fullPayment: "全额付款",
      dpPayment: "定金 30%",
    },
  } satisfies Record<Locale, Record<string, string>>

  return dict[locale]
}

export default async function MerchantBookingDetailPage({ params }: MerchantBookingPageProps) {
  const { id } = await params
  const locale = normalizeLocale(await getCurrentLocale())
  const t = getText(locale)
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!merchant?.id) return null

  const { data: booking } = await adminSupabase
    .from("bookings")
    .select(
      "id, booking_code, customer_name, customer_email, customer_phone, pickup_date, adult_count, child_count, payment_status, booking_status, payment_type, total_amount, dp_amount, final_payment_amount, package_id",
    )
    .eq("id", id)
    .maybeSingle<BookingRow>()

  if (!booking?.package_id) {
    return <div className="p-6 text-sm text-rose-700">{t.bookingNotFound}</div>
  }

  const { data: pkg } = await adminSupabase
    .from("packages")
    .select("id, title")
    .eq("id", booking.package_id)
    .eq("merchant_id", merchant.id)
    .maybeSingle<{ id: string; title: string | null }>()

  if (!pkg?.id) {
    return <div className="p-6 text-sm text-rose-700">{t.bookingNotFound}</div>
  }

  const { data: linkedRoom } = await adminSupabase
    .from("package_chat_rooms")
    .select("id")
    .eq("merchant_user_id", user.id)
    .eq("booking_id", booking.id)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle<ChatRoomRow>()

  const participantCount = Number(booking.adult_count || 0) + Number(booking.child_count || 0)
  const paymentType = normalizeStatus(booking.payment_type) === "dp" ? t.dpPayment : t.fullPayment

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-950">{t.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{t.subtitle}</p>
        </section>

        <section className="mt-6 rounded-[28px] border border-orange-100 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.bookingCode}</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{booking.booking_code || booking.id}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.packageLabel}</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{pkg.title || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.customer}</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{booking.customer_name || "-"}</p>
              <p className="mt-1 text-sm text-slate-600">{booking.customer_email || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.phone}</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{booking.customer_phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.tripDate}</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(booking.pickup_date)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.participantCount}</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{participantCount}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.paymentType}</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{paymentType}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.bookingStatus}</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{titleCaseStatus(booking.booking_status)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.paymentStatus}</p>
              <span
                className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getPaymentStatusTone(
                  booking.payment_status,
                  "bordered",
                )}`}
              >
                {titleCaseStatus(booking.payment_status)}
              </span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.total}</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{formatIdr(booking.total_amount)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {t.dpAmount}: {formatIdr(booking.dp_amount)} | {t.finalPayment}: {formatIdr(booking.final_payment_amount)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={
                linkedRoom?.id
                  ? `/merchant/chat?booking_id=${encodeURIComponent(booking.id)}&room_id=${encodeURIComponent(linkedRoom.id)}`
                  : `/merchant/chat?booking_id=${encodeURIComponent(booking.id)}`
              }
              className="rounded-[18px] bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              {t.openChat}
            </Link>
            <Link
              href="/merchant/pesanan"
              className="rounded-[18px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
            >
              {t.backToOrders}
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
