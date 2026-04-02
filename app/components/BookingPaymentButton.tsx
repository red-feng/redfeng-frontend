"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Locale } from "@/lib/i18n"

type BookingPaymentButtonProps = {
  bookingId: string
  label: string
  locale?: Locale
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
  locale = "id",
  className = "",
  cleanupOnAbandon = false,
  redirectOnCleanup = "/customer/dashboard?info=Draft%20booking%20dibatalkan",
}: BookingPaymentButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const t =
    locale === "en"
      ? {
          openingFailed: "The payment popup cannot be opened yet. Please try again shortly.",
          snapUnavailable: "Midtrans Snap is not ready in this browser. Reload the page and try again.",
          paymentFailedCleanup: "Payment was not processed successfully. The draft booking was cleaned up automatically.",
          paymentFailed: "Payment could not be processed successfully. Please try again.",
          popupClosedCleanup: "The payment popup was closed. The draft booking was cleaned up automatically.",
          popupClosed: "The payment popup was closed before the process finished.",
          openingError: "There was a problem opening the payment flow. Please try again.",
          processing: "Processing...",
        }
      : locale === "zh"
        ? {
            openingFailed: "暂时无法打开付款弹窗，请稍后再试。",
            snapUnavailable: "当前浏览器中的 Midtrans Snap 尚未就绪。请刷新页面后重试。",
            paymentFailedCleanup: "付款尚未成功处理，草稿订单已自动清理。",
            paymentFailed: "付款尚未成功处理，请重试。",
            popupClosedCleanup: "付款弹窗已关闭，草稿订单已自动清理。",
            popupClosed: "付款弹窗在流程完成前已关闭。",
            openingError: "打开付款流程时发生问题，请重试。",
            processing: "处理中...",
          }
        : {
            openingFailed: "Popup pembayaran belum bisa dibuka. Coba lagi sebentar.",
            snapUnavailable: "Snap Midtrans belum siap di browser ini. Muat ulang halaman lalu coba lagi.",
            paymentFailedCleanup: "Pembayaran belum berhasil diproses. Draft booking dibersihkan otomatis.",
            paymentFailed: "Pembayaran belum berhasil diproses. Silakan coba lagi.",
            popupClosedCleanup: "Popup pembayaran ditutup. Draft booking dibersihkan otomatis.",
            popupClosed: "Popup pembayaran ditutup sebelum proses selesai.",
            openingError: "Terjadi gangguan saat membuka pembayaran. Silakan coba lagi.",
            processing: "Memproses...",
          }

  async function syncPaymentAndRedirect(orderId: string | undefined, redirectTo: string) {
    try {
      await fetch("/api/payments/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          order_id: orderId,
          locale,
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
        body: JSON.stringify({ booking_id: bookingId, locale }),
      })

      const payload = await response.json()
      if (!response.ok || !payload.snap_token) {
        setErrorMessage(payload?.error || t.openingFailed)
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
        setErrorMessage(t.snapUnavailable)
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
            void cleanupDraftBooking(t.paymentFailedCleanup)
            return
          }
          setErrorMessage(t.paymentFailed)
          setLoading(false)
        },
        onClose: () => {
          if (cleanupOnAbandon) {
            void cleanupDraftBooking(t.popupClosedCleanup)
            return
          }
          setErrorMessage(t.popupClosed)
          setLoading(false)
        },
      })
    } catch {
      setErrorMessage(t.openingError)
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
        {loading ? t.processing : label}
      </button>
      {errorMessage ? <p className="text-sm font-medium text-rose-600">{errorMessage}</p> : null}
    </div>
  )
}
