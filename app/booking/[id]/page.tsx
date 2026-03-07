import { createAdminClient } from "@/lib/supabase/admin"
import ReviewForm from "./ReviewForm"
import { submitPackageReview } from "./actions"

export const dynamic = "force-dynamic"

type BookingPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}

export default async function BookingPage({ params, searchParams }: BookingPageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const supabase = createAdminClient()

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, booking_code, customer_name, customer_email, total_amount, booking_status, payment_status, package_id")
    .eq("id", id)
    .single()

  if (error || !booking) {
    return <div className="p-10">Booking tidak ditemukan</div>
  }

  const { data: existingReview } = await supabase
    .from("package_reviews")
    .select("id, rating, comment")
    .eq("booking_id", booking.id)
    .maybeSingle()

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Booking Berhasil</h1>
          <p className="mt-2 text-sm text-slate-500">
            Detail booking, status pembayaran, dan form review customer tersedia di halaman ini.
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

        <section className="mt-6 grid gap-4 md:grid-cols-3">
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
            <p className="mt-2 text-xl font-bold text-slate-900">{booking.payment_status || "-"}</p>
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
              <p className="mt-2 font-medium text-slate-900">{booking.booking_status || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Status Pembayaran</p>
              <p className="mt-2 font-medium text-slate-900">{booking.payment_status || "-"}</p>
            </div>
          </div>
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
