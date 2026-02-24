"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Script from "next/script"

export default function PaketPage() {
  const { slug } = useParams()

  const [paket, setPaket] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [pickupDate, setPickupDate] = useState("")
  const [adultCount, setAdultCount] = useState(1)
  const [childCount, setChildCount] = useState(0)

  // ===============================
  // FETCH PACKAGE FROM SUPABASE
  // ===============================
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`/api/packages/${slug}`)
      const data = await res.json()

      setPaket(data)
      setLoading(false)
    }

    if (slug) fetchData()
  }, [slug])

  if (loading) return <div className="p-10">Loading...</div>
  if (!paket) return <div className="p-10">Paket tidak ditemukan</div>

  // ===============================
  // BOOKING FLOW
  // ===============================
  const handleBooking = async () => {
    const bookingRes = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package_id: paket.id,
        pickup_date: pickupDate,
        adult_count: adultCount,
        child_count: childCount,
        customer_name: "Guest User",
        customer_email: "guest@email.com",
        customer_phone: "08123456789"
      })
    })

    const bookingData = await bookingRes.json()

    if (!bookingRes.ok) {
      alert(bookingData.error)
      return
    }

    const paymentRes = await fetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingData.booking_id })
    })

    const paymentData = await paymentRes.json()

    window.snap.pay(paymentData.snap_token)
  }

  return (
    <>
      <Script
        src="https://app.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
      />

      <main className="max-w-4xl mx-auto p-10">
        <h1 className="text-4xl font-bold mb-4">{paket.title}</h1>

        <p className="mb-6 text-gray-600">
          {paket.destination} • {paket.duration}
        </p>

        <div className="mb-6">
          <p>Harga Dewasa: Rp {paket.price_adult}</p>
          <p>Harga Anak: Rp {paket.price_child}</p>
        </div>

        <div className="space-y-4">
          <input
            type="date"
            className="border p-2 w-full"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
          />

          <div>
            <label>Dewasa</label>
            <input
              type="number"
              min="1"
              className="border p-2 w-full"
              value={adultCount}
              onChange={(e) => setAdultCount(Number(e.target.value))}
            />
          </div>

          <div>
            <label>Anak</label>
            <input
              type="number"
              min="0"
              className="border p-2 w-full"
              value={childCount}
              onChange={(e) => setChildCount(Number(e.target.value))}
            />
          </div>

          <button
            onClick={handleBooking}
            className="bg-black text-white px-6 py-3 w-full"
          >
            BOOK NOW
          </button>
        </div>
      </main>
    </>
  )
}