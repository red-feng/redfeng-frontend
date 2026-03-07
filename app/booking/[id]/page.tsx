import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import ReviewForm from "./ReviewForm"
import { confirmCustomerPickedUp, submitPackageReview } from "./actions"

export const dynamic = "force-dynamic"

type BookingPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function titleCaseStatus(value: string | null) {
  const normalized = (value || "").trim().toLowerCase()
  if (!normalized) return "-"
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default async function BookingPage({ params, searchParams }: BookingPageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const authSupabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) {
    return <div className="p-10">Silakan login untuk melihat booking Anda.</div>
  }

  const { data: booking, error } = await adminSupabase
    .from("bookings")
    .select("id, user_id, booking_code, customer_name, customer_email, total_amount, booking_status, payment_status, package_id, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at")
    .eq("id", id)
    .single()

  if (error || !booking || booking.user_id !== user.id) {
    return <div className="p-10">Booking tidak ditemukan</div>
  }

  const { data: existingReview } = await adminSupabase
    .from("package_reviews")
    .select("id, rating, comment")
    .eq("booking_id", booking.id)
    .maybeSingle()

  const timeline = [
    {
      label: "Merchant tiba di meeting point",
      done: Boolean(booking.merchant_arrived_at),
      value: booking.merchant_arrived_at,
    },
    {
      label: "Merchant menekan Dijemput",
      done: Boolean(booking.merchant_picked_up_at),
      value: booking.merchant_picked_up_at,
    },
    {
      label: "Customer konfirmasi Sudah dijemput",
      done: Boolean(booking.customer_picked_up_at),
      value: booking.customer_picked_up_at,
    },
  ]

  const canConfirmPickup = Boolean(booking.merchant_picked_up_at) && !booking.customer_picked_up_at

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Booking Berhasil</h1>
          <p className="mt-2 text-sm text-slate-500">
            Dana customer masuk ke rekening RedFeng dan tetap ditahan sampai pickup dikonfirmasi merchant dan customer.
          </p>
        </section>

        {resolvedSearchParams.success && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {resolvedSearchParams.success}
          </div>
        )}

        {resolvedSearchParams.error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {resolvedSearchParams.error}
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Kode Booking</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{booking.booking_code || booking.id}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              Rp {Number(booking.total_amount ?? 0).toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Status Pembayaran</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{titleCaseStatus(booking.payment_status)}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Status Escrow</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{titleCaseStatus(booking.escrow_status)}</p>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Detail Booking</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Nama</p>
              <p className="mt-2 font-medium text-slate-900">{booking.customer_name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="mt-2 font-medium text-slate-900">{booking.customer_email || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Status Booking</p>
              <p className="mt-2 font-medium text-slate-900">{titleCaseStatus(booking.booking_status)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Status Pembayaran</p>
              <p className="mt-2 font-medium text-slate-900">{titleCaseStatus(booking.payment_status)}</p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-slate-900">Progress Meeting Point</h2>
            <p className="text-sm text-slate-500">
              Dana baru siap diproses ke merchant setelah merchant dan customer sama-sama menyelesaikan konfirmasi pickup.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {timeline.map((item) => (
              <div key={item.label} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className={`mt-2 text-xs font-semibold ${item.done ? "text-emerald-600" : "text-slate-500"}`}>
                  {item.done ? "Selesai" : "Menunggu"}
                </p>
                <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.value)}</p>
              </div>
            ))}
          </div>

          {canConfirmPickup && (
            <form action={confirmCustomerPickedUp} className="mt-6">
              <input type="hidden" name="booking_id" value={booking.id} />
              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Sudah dijemput
              </button>
            </form>
          )}
        </section>

        {existingReview ? (
          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Review Anda</h2>
            <p className="mt-3 text-sm text-slate-600">Rating: {existingReview.rating ?? "-"} / 5</p>
            <p className="mt-2 text-sm text-slate-700">{existingReview.comment || "-"}</p>
          </div>
        ) : booking.package_id ? (
          <ReviewForm
            bookingId={booking.id}
            packageId={booking.package_id}
            customerName={booking.customer_name || "Customer"}
            submitAction={submitPackageReview}
          />
        ) : null}
      </div>
    </main>
  )
}
