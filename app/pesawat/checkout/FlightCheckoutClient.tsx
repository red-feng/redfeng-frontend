"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import SimplePublicLogoHeader from "@/app/components/SimplePublicLogoHeader"
import { createClient } from "@/lib/supabase/client"

export type FlightCheckoutData = {
  offerId: string
  title: string
  airline: string
  flightNumber: string
  origin: string
  destination: string
  route: string
  departDate: string
  returnDate: string
  departureTime: string
  arrivalTime: string
  duration: string
  transit: string
  cabin: string
  tripType: string
  passengers: string
  price: number
  fareReferenceId: string
  source: string
}

function formatIdr(value: number) {
  return `Rp ${Math.max(Number(value || 0), 0).toLocaleString("id-ID")}`
}

function getPassengerCount(value: string) {
  const matches = value.match(/\d+/g)
  if (!matches) return 1
  return matches.reduce((total, current) => total + Number(current || "0"), 0) || 1
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function FlightCheckoutClient({ data }: { data: FlightCheckoutData }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const passengerCount = getPassengerCount(data.passengers)
  const subtotal = data.price * passengerCount
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [passengerManifest, setPassengerManifest] = useState("")

  useEffect(() => {
    let mounted = true

    supabase.auth.getUser().then(({ data: sessionData }) => {
      if (!mounted) return
      const user = sessionData.user
      setIsAuthenticated(Boolean(user))
      setEmail(user?.email || "")
      setCheckingSession(false)
    })

    return () => {
      mounted = false
    }
  }, [supabase])

  const currentPath = `${pathname}?${searchParams.toString()}`

  async function handleSubmit() {
    setError("")

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(currentPath)}`)
      return
    }

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Nama, email, dan nomor telepon wajib diisi.")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch("/api/flights/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer_id: data.offerId,
          title: data.title,
          airline: data.airline,
          flight_number: data.flightNumber,
          origin: data.origin,
          destination: data.destination,
          route: data.route,
          depart_date: data.departDate,
          return_date: data.returnDate,
          departure_time: data.departureTime,
          arrival_time: data.arrivalTime,
          duration: data.duration,
          transit: data.transit,
          cabin: data.cabin,
          trip_type: data.tripType,
          passengers: data.passengers,
          price: data.price,
          fare_reference_id: data.fareReferenceId,
          source: data.source,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          passenger_manifest: passengerManifest,
        }),
      })
      const payload = await response.json()

      if (!response.ok || !payload.booking_id) {
        setError(payload.error || "Gagal membuat booking pesawat.")
        setSubmitting(false)
        return
      }

      router.push(`/booking/${payload.booking_id}`)
    } catch {
      setError("Server belum bisa membuat booking pesawat.")
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="bg-[#f8fafc]">
        <SimplePublicLogoHeader />
      </div>
      <main className="min-h-screen bg-[#f8fafc] px-4 py-6 sm:px-6 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">Checkout Pesawat</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {data.title || `${data.origin} ke ${data.destination}`}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Booking ini akan masuk queue recheck fare. Setelah fare dan hold supplier valid, payment akan dibuka.
            </p>

            {!checkingSession && !isAuthenticated ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Login diperlukan sebelum booking pesawat bisa dibuat.
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Nama customer</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nama sesuai kontak booking"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="email@contoh.com"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Nomor telepon</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="081234567890"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Manifest penumpang</span>
                <textarea
                  value={passengerManifest}
                  onChange={(event) => setPassengerManifest(event.target.value)}
                  placeholder="MR | Nama Penumpang | email@contoh.com"
                  rows={5}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Isi satu baris per penumpang. Jika dikosongkan, admin akan melengkapi manifest saat recheck.
                </p>
              </label>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={checkingSession || submitting}
              className="mt-6 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto sm:px-6"
            >
              {submitting ? "Menyimpan..." : isAuthenticated ? "Buat booking pesawat" : "Login untuk booking"}
            </button>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Ringkasan Flight</p>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{data.airline || "Airline"}</p>
                    <p className="mt-1 text-xs text-slate-500">{data.flightNumber || data.offerId}</p>
                  </div>
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                    {labelize(data.cabin || "economy")}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div>
                    <p className="text-2xl font-bold text-slate-950">{data.departureTime || "-"}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{data.origin}</p>
                  </div>
                  <div className="h-px min-w-12 bg-slate-300" />
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-950">{data.arrivalTime || "-"}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{data.destination}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-2 text-sm text-slate-600">
                  <div className="flex justify-between gap-4">
                    <span>Tanggal berangkat</span>
                    <span className="font-semibold text-slate-900">{data.departDate || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Durasi</span>
                    <span className="font-semibold text-slate-900">{data.duration || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Transit</span>
                    <span className="font-semibold text-slate-900">{data.transit || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Penumpang</span>
                    <span className="font-semibold text-slate-900">{passengerCount} pax</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Estimasi Payment</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <span>Harga per pax</span>
                  <span className="font-semibold text-slate-900">{formatIdr(data.price)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatIdr(subtotal)}</span>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                  Total final dan payment link akan mengikuti hasil recheck fare dan hold dari supplier.
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </>
  )
}
