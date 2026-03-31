"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type BookingPaymentButtonProps = {
  bookingId: string
  label: string
  className?: string
  cleanupOnAbandon?: boolean
  redirectOnCleanup?: string
}

type SnapResult = {
  order_id?: string
}

export default function BookingPaymentButton({
  bookingId,
  label,
  className = "",
  cleanupOnAbandon = false,
  redirectOnCleanup = "/customer/dashboard?info=Draft%20booking%20dibatalkan",
}: BookingPaymentButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  async function syncPaymentAndRedirect(orderId: string | undefined, redirectTo: string) {
    try {
      await fetch("/api/payments/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          order_id: orderId,
        }),
      })
    } finally {
      router.push(redirectTo)
    }
  }

  async function handlePayment() {
    setLoading(true)
    setErrorMessage("")

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      })

      const payload = await response.json()
      if (!response.ok || !payload.snap_token) {
        setErrorMessage(payload?.error || "Popup pembayaran belum bisa dibuka. Coba lagi sebentar.")
        setLoading(false)
        return
      }

      const snap = (window as Window & {
        snap?: {
          pay: (
            token: string,
            callbacks?: {
              onSuccess?: (result?: SnapResult) => void
              onPending?: (result?: SnapResult) => void
              onError?: () => void
              onClose?: () => void
            },
          ) => void
        }
      }).snap

      if (!snap) {
        setErrorMessage("Snap Midtrans belum siap di browser ini. Muat ulang halaman lalu coba lagi.")
        setLoading(false)
        return
      }

      snap.pay(payload.snap_token, {
        ...(payload.snap_mode === "qr" ? { uiMode: "qr" as const } : {}),
        onSuccess: async (result) => {
          await syncPaymentAndRedirect(result?.order_id || payload.order_id, "/customer/dashboard?payment=success")
        },
        onPending: async (result) => {
          await syncPaymentAndRedirect(result?.order_id || payload.order_id, "/customer/dashboard?payment=pending")
        },
        onError: () => {
          if (cleanupOnAbandon) {
            void cleanupDraftBooking("Pembayaran belum berhasil diproses. Draft booking dibersihkan otomatis.")
            return
          }
          setErrorMessage("Pembayaran belum berhasil diproses. Silakan coba lagi.")
          setLoading(false)
        },
        onClose: () => {
          if (cleanupOnAbandon) {
            void cleanupDraftBooking("Popup pembayaran ditutup. Draft booking dibersihkan otomatis.")
            return
          }
          setErrorMessage("Popup pembayaran ditutup sebelum proses selesai.")
          setLoading(false)
        },
      })
    } catch {
      setErrorMessage("Terjadi gangguan saat membuka pembayaran. Silakan coba lagi.")
      setLoading(false)
    }
  }

  async function cleanupDraftBooking(message: string) {
    try {
      await fetch("/api/bookings/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      })
    } finally {
      router.push(redirectOnCleanup)
      router.refresh()
      setErrorMessage(message)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={handlePayment} disabled={loading} className={className}>
        {loading ? "Memproses..." : label}
      </button>
      {errorMessage ? <p className="text-sm font-medium text-rose-600">{errorMessage}</p> : null}
    </div>
  )
}
