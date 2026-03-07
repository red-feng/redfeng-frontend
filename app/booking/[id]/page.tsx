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
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 shadow">
        <h1 className="mb-6 text-3xl font-bold">Booking Berhasil</h1>

        {resolvedSearchParams.success && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {resolvedSearchParams.success}
          </div>
        )}

        {resolvedSearchParams.error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {resolvedSearchParams.error}
          </div>
        )}

        <div className="space-y-2 text-lg">
          <p><strong>Kode Booking:</strong> {booking.booking_code}</p>
          <p><strong>Nama:</strong> {booking.customer_name}</p>
          <p><strong>Email:</strong> {booking.customer_email}</p>
          <p><strong>Total:</strong> Rp {Number(booking.total_amount ?? 0).toLocaleString("id-ID")}</p>
          <p><strong>Status Booking:</strong> {booking.booking_status}</p>
          <p><strong>Status Pembayaran:</strong> {booking.payment_status}</p>
        </div>

        {existingReview ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
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
