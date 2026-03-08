"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { dictionaries, type Locale } from "@/lib/i18n"

type CheckoutPackageData = {
  id: string
  slug: string
  title: string | null
  price_adult: number | null
  price_child: number | null
  currency: string | null
  duration: number | null
  minimal_peserta: number | null
  cover_image: string | null
}

export default function CheckoutClient({
  data,
  locale = "id",
}: {
  data: CheckoutPackageData
  locale?: Locale
}) {
  const supabase = createClient()
  const router = useRouter()
  const t = dictionaries[locale].checkout

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [pickupDate, setPickupDate] = useState("")
  const [adultCount, setAdultCount] = useState(1)
  const [childCount, setChildCount] = useState(0)

  const adultPrice = data.price_adult ?? 0
  const childPrice = data.price_child ?? 0
  const subtotal = useMemo(
    () => adultPrice * adultCount + childPrice * childCount,
    [adultCount, adultPrice, childCount, childPrice],
  )
  const adminFee = Math.round(subtotal * 0.03)
  const ppn = Math.round((subtotal + adminFee) * 0.11)
  const total = subtotal + adminFee + ppn

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setIsAuthenticated(Boolean(session?.user))
      setCheckingSession(false)

      if (session?.user?.email) {
        setEmail(session.user.email)
      }

      const fullName = (session?.user?.user_metadata?.full_name as string | undefined) || ""
      const phoneNumber = (session?.user?.user_metadata?.phone_number as string | undefined) || ""
      if (fullName) {
        setNama(fullName)
      }
      if (phoneNumber) {
        setPhone(phoneNumber)
      }
    }

    checkSession()
  }, [supabase])

  const handleBooking = async () => {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/checkout/${data.slug}`)}`)
      return
    }

    if (!pickupDate) {
      setErrorMsg("Pilih tanggal wisata terlebih dahulu")
      return
    }

    setSubmitting(true)
    setErrorMsg("")

    try {
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_id: data.id,
          pickup_date: pickupDate,
          adult_count: adultCount,
          child_count: childCount,
          customer_name: nama,
          customer_email: email,
          customer_phone: phone,
        }),
      })

      const bookingPayload = await bookingRes.json()

      if (!bookingRes.ok || !bookingPayload.booking_id) {
        setErrorMsg(bookingPayload.error || t.saveBookingFailed)
        setSubmitting(false)
        return
      }

      const paymentRes = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingPayload.booking_id }),
      })

      const snapData = await paymentRes.json()

      if (!paymentRes.ok || !snapData.snap_token) {
        setErrorMsg(snapData.error || t.createTransactionFailed)
        setSubmitting(false)
        return
      }

      const snap = (window as Window & {
        snap?: {
          pay: (token: string, callbacks?: Record<string, () => void>) => void
        }
      }).snap

      if (!snap) {
        setErrorMsg(t.snapNotReady)
        setSubmitting(false)
        return
      }

      snap.pay(snapData.snap_token, {
        onSuccess: () => router.push(`/booking/${bookingPayload.booking_id}`),
        onPending: () => router.push(`/booking/${bookingPayload.booking_id}`),
        onError: () => setSubmitting(false),
        onClose: () => setSubmitting(false),
      })
    } catch {
      setErrorMsg("Terjadi gangguan saat membuat booking")
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-6 md:p-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-500">Checkout</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{data.title || "Detail Payment"}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Lengkapi data customer dan tanggal wisata untuk melanjutkan ke detail payment.
          </p>

          {!checkingSession && !isAuthenticated && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Anda harus login terlebih dahulu sebelum bisa membuat booking dan melanjutkan pembayaran.
            </div>
          )}

          {errorMsg && (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t.name}</label>
              <input
                value={nama}
                onChange={(event) => setNama(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t.phone}</label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Tanggal wisata</label>
              <input
                type="date"
                value={pickupDate}
                onChange={(event) => setPickupDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Peserta dewasa</label>
              <input
                type="number"
                min="1"
                value={adultCount}
                onChange={(event) => setAdultCount(Number(event.target.value) || 1)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Peserta anak</label>
              <input
                type="number"
                min="0"
                value={childCount}
                onChange={(event) => setChildCount(Number(event.target.value) || 0)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
          </div>
        </section>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            {data.cover_image ? (
              <Image
                src={data.cover_image}
                alt={data.title || "Package"}
                width={1200}
                height={800}
                unoptimized
                className="h-56 w-full object-cover"
              />
            ) : (
              <div className="h-56 bg-slate-100" />
            )}
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900">Ringkasan Payment</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Harga dewasa</span>
                  <span className="font-semibold text-slate-900">{data.currency || "IDR"} {adultPrice.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Harga anak</span>
                  <span className="font-semibold text-slate-900">{data.currency || "IDR"} {childPrice.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Durasi</span>
                  <span className="font-semibold text-slate-900">{data.duration || 0} hari</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Minimal peserta</span>
                  <span className="font-semibold text-slate-900">{data.minimal_peserta || 0} orang</span>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-900">Rp {subtotal.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Admin fee</span>
                    <span className="font-semibold text-slate-900">Rp {adminFee.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>PPN</span>
                    <span className="font-semibold text-slate-900">Rp {ppn.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-base font-bold text-slate-900">
                    <span>{t.totalPay}</span>
                    <span>Rp {total.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBooking}
                disabled={submitting}
                className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {!checkingSession && !isAuthenticated ? "Login untuk Booking" : submitting ? "Memproses..." : t.createBookingPay}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}
