"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { dictionaries, type Locale } from "@/lib/i18n"
import { formatPackageMoney } from "@/lib/package-pricing"
import { getScheduleQuotaLabel, isQuotaTravelStyle } from "@/lib/travelStyles"
import { normalizePaymentMethod, resolveCustomerAdminFeePercent, type FinancePaymentMethod } from "@/lib/finance/settings"

type CheckoutPackageData = {
  id: string
  slug: string
  title: string | null
  departure_date: string | null
  price_adult: number | null
  price_child: number | null
  currency: string | null
  duration: number | null
  minimal_peserta: number | null
  travel_style: string | null
  cover_image: string | null
}

type CheckoutFinanceSettings = {
  customerTaxPercent: number
  customerAdminFeeRules: Record<FinancePaymentMethod, number>
}

type CheckoutPaymentPricing = {
  currency: string
  adultPrice: number
  childPrice: number
  exchangeDate: string | null
}

export default function CheckoutClient({
  data,
  locale = "id",
  financeSettings,
  paymentPricing,
}: {
  data: CheckoutPackageData
  locale?: Locale
  financeSettings: CheckoutFinanceSettings
  paymentPricing: CheckoutPaymentPricing
}) {
  const supabase = createClient()
  const router = useRouter()
  const t = dictionaries[locale].checkout
  const participantLabel = getScheduleQuotaLabel(data.travel_style, locale)
  const usesFixedDeparture = isQuotaTravelStyle(data.travel_style)

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
  const [paymentMethod, setPaymentMethod] = useState<FinancePaymentMethod>("bank_transfer")
  const minimumParticipants = Math.max(Number(data.minimal_peserta || 0), 1)
  const totalParticipants = adultCount + childCount
  const hasMetMinimumParticipants = totalParticipants >= minimumParticipants

  const adultPrice = data.price_adult ?? 0
  const childPrice = data.price_child ?? 0
  const localizedSubtotal = useMemo(
    () => adultPrice * adultCount + childPrice * childCount,
    [adultCount, adultPrice, childCount, childPrice],
  )
  const paymentAdultPrice = paymentPricing.adultPrice ?? 0
  const paymentChildPrice = paymentPricing.childPrice ?? 0
  const subtotal = useMemo(
    () => paymentAdultPrice * adultCount + paymentChildPrice * childCount,
    [adultCount, childCount, paymentAdultPrice, paymentChildPrice],
  )
  const customerAdminFeePercent = resolveCustomerAdminFeePercent(paymentMethod, {
    redfengCommissionPercent: 0,
    customerAdminFeePercent: 0,
    customerTaxPercent: financeSettings.customerTaxPercent,
    merchantTransferFee: 0,
    customerAdminFeeRules: financeSettings.customerAdminFeeRules,
    merchantTransferFeeRules: { default: 0 },
  })
  const adminFee = Math.round(subtotal * (customerAdminFeePercent / 100))
  const ppn = Math.round((subtotal + adminFee) * (financeSettings.customerTaxPercent / 100))
  const total = subtotal + adminFee + ppn
  const paymentMethodOptions: Array<{ value: FinancePaymentMethod; label: string; hint: string }> = [
    {
      value: "bank_transfer",
      label: "Bank transfer",
      hint: "Cocok untuk VA / transfer bank dan biasanya jadi jalur paling umum.",
    },
    {
      value: "qris",
      label: "QRIS",
      hint: "Untuk customer yang ingin scan QR dan bayar cepat dari aplikasi bank / e-wallet.",
    },
    {
      value: "credit_card",
      label: "Kartu kredit",
      hint: "Fee customer biasanya lebih tinggi karena biaya channel kartu.",
    },
  ]

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

  const effectivePickupDate = usesFixedDeparture ? (data.departure_date || "") : pickupDate
  const participantCombinationHint =
    minimumParticipants > 1
      ? `Minimal ${minimumParticipants} peserta total. Contoh: dewasa ${minimumParticipants}, dewasa ${Math.max(minimumParticipants - 1, 1)} + anak 1, atau kombinasi lain selama total peserta mencapai ${minimumParticipants}.`
      : ""
  const minimumParticipantsMessage =
    minimumParticipants > 1
      ? `Minimal peserta untuk paket ini ${minimumParticipants} orang. Total dewasa dan anak harus mencapai minimal tersebut sebelum booking bisa dilanjutkan.`
      : ""

  const handleBooking = async () => {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/checkout/${data.slug}`)}`)
      return
    }

    if (!effectivePickupDate) {
      setErrorMsg("Pilih tanggal wisata terlebih dahulu")
      return
    }

    if (!hasMetMinimumParticipants) {
      setErrorMsg(`Minimal peserta untuk paket ini ${minimumParticipants} orang.`)
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
          locale,
          pickup_date: effectivePickupDate,
          adult_count: adultCount,
          child_count: childCount,
          customer_name: nama,
          customer_email: email,
          customer_phone: phone,
          payment_method: normalizePaymentMethod(paymentMethod),
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
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {usesFixedDeparture ? "Tanggal keberangkatan" : "Tanggal wisata"}
              </label>
              <input
                type="date"
                value={effectivePickupDate}
                onChange={(event) => setPickupDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                min={usesFixedDeparture && data.departure_date ? data.departure_date : undefined}
                max={usesFixedDeparture && data.departure_date ? data.departure_date : undefined}
                readOnly={usesFixedDeparture}
              />
              {usesFixedDeparture && (
                <p className="mt-2 text-xs text-slate-500">
                  Jadwal keberangkatan untuk paket ini sudah tetap dan mengikuti tanggal yang ditentukan merchant.
                </p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Peserta dewasa</label>
              <input
                type="number"
                min="1"
                value={adultCount}
                onChange={(event) => setAdultCount(Math.max(Number(event.target.value) || 1, 1))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Peserta anak</label>
              <input
                type="number"
                min="0"
                value={childCount}
                onChange={(event) => setChildCount(Math.max(Number(event.target.value) || 0, 0))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
          </div>

          {participantCombinationHint ? (
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-800">
              {participantCombinationHint}
            </div>
          ) : null}

          {minimumParticipantsMessage ? (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                hasMetMinimumParticipants
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <p>{minimumParticipantsMessage}</p>
              <p className="mt-1 font-semibold">
                Total peserta saat ini: {totalParticipants} / {minimumParticipants} orang
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            <label className="mb-3 block text-sm font-medium text-slate-700">Metode pembayaran</label>
            <div className="grid gap-3">
              {paymentMethodOptions.map((option) => {
                const optionFeePercent = resolveCustomerAdminFeePercent(option.value, {
                  redfengCommissionPercent: 0,
                  customerAdminFeePercent: 0,
                  customerTaxPercent: financeSettings.customerTaxPercent,
                  merchantTransferFee: 0,
                  customerAdminFeeRules: financeSettings.customerAdminFeeRules,
                  merchantTransferFeeRules: { default: 0 },
                })

                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-2xl border px-4 py-4 transition ${
                      paymentMethod === option.value
                        ? "border-orange-300 bg-orange-50"
                        : "border-slate-200 bg-slate-50 hover:border-orange-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                        <p className="mt-1 text-xs leading-6 text-slate-500">{option.hint}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Admin fee</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{optionFeePercent}%</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payment_method"
                      value={option.value}
                      checked={paymentMethod === option.value}
                      onChange={() => setPaymentMethod(option.value)}
                      className="sr-only"
                    />
                  </label>
                )
              })}
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              Total customer akan dihitung mengikuti metode yang Anda pilih di sini, lalu sistem hanya membuka channel pembayaran yang sesuai.
            </p>
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
                  <span className="font-semibold text-slate-900">{formatPackageMoney(adultPrice, data.currency, locale)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Harga anak</span>
                  <span className="font-semibold text-slate-900">{formatPackageMoney(childPrice, data.currency, locale)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Durasi</span>
                  <span className="font-semibold text-slate-900">{data.duration || 0} hari</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{participantLabel} total</span>
                  <span className="font-semibold text-slate-900">{data.minimal_peserta || 0} orang</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total peserta dipilih</span>
                  <span className={`font-semibold ${hasMetMinimumParticipants ? "text-emerald-700" : "text-rose-700"}`}>
                    {totalParticipants} orang
                  </span>
                </div>
                {usesFixedDeparture && data.departure_date && (
                  <div className="flex items-center justify-between">
                    <span>Tanggal keberangkatan</span>
                    <span className="font-semibold text-slate-900">{data.departure_date}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-3">
                  <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                    Pembayaran diproses dalam {paymentPricing.currency}. Harga paket mengikuti bahasa pilihan Anda, lalu dikonversi ke IDR saat checkout.
                    {paymentPricing.exchangeDate ? ` Kurs acuan: ${paymentPricing.exchangeDate}.` : ""}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Subtotal paket ({data.currency || "IDR"})</span>
                    <span className="font-semibold text-slate-900">{formatPackageMoney(localizedSubtotal, data.currency, locale)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Subtotal pembayaran</span>
                    <span className="font-semibold text-slate-900">Rp {subtotal.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Admin fee {paymentMethod === "credit_card" ? "kartu kredit" : paymentMethod === "qris" ? "QRIS" : "bank transfer"} ({customerAdminFeePercent}%)</span>
                    <span className="font-semibold text-slate-900">Rp {adminFee.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Pajak ({financeSettings.customerTaxPercent}%)</span>
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
                disabled={submitting || !hasMetMinimumParticipants}
                className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {!checkingSession && !isAuthenticated
                  ? "Login untuk Booking"
                  : !hasMetMinimumParticipants
                    ? `Minimal ${minimumParticipants} peserta`
                    : submitting
                      ? "Memproses..."
                      : t.createBookingPay}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}
