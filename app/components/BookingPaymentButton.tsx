"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type BookingPaymentButtonProps = {
  bookingId: string
  label: string
  className?: string
}

export default function BookingPaymentButton({
  bookingId,
  label,
  className = "",
}: BookingPaymentButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handlePayment() {
    setLoading(true)

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      })

      const payload = await response.json()
      if (!response.ok || !payload.snap_token) {
        setLoading(false)
        return
      }

      const snap = (window as Window & {
        snap?: {
          pay: (
            token: string,
            callbacks?: {
              onSuccess?: () => void
              onPending?: () => void
              onError?: () => void
              onClose?: () => void
            },
          ) => void
        }
      }).snap

      if (!snap) {
        setLoading(false)
        return
      }

      snap.pay(payload.snap_token, {
        ...(payload.snap_mode === "qr" ? { uiMode: "qr" as const } : {}),
        onSuccess: () => router.refresh(),
        onPending: () => router.refresh(),
        onError: () => setLoading(false),
        onClose: () => setLoading(false),
      })
    } catch {
      setLoading(false)
    }
  }

  return (
    <button type="button" onClick={handlePayment} disabled={loading} className={className}>
      {loading ? "Memproses..." : label}
    </button>
  )
}
