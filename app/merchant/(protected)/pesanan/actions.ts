"use server"

import { redirect } from "next/navigation"
import { type Locale, normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

async function getMerchantOwnedBooking(bookingId: string, userId: string) {
  const adminSupabase = createAdminClient()

  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", userId)
    .single()

  if (!merchant) {
    return { error: "Data merchant tidak ditemukan", booking: null as null }
  }

  const { data: booking } = await adminSupabase
    .from("bookings")
    .select("id, package_id, payment_status, booking_status, escrow_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at")
    .eq("id", bookingId)
    .single()

  if (!booking?.package_id) {
    return { error: "Booking tidak ditemukan", booking: null as null }
  }

  const { data: pkg } = await adminSupabase
    .from("packages")
    .select("merchant_id")
    .eq("id", booking.package_id)
    .single()

  if (!pkg || pkg.merchant_id !== merchant.id) {
    return { error: "Booking bukan milik merchant ini", booking: null as null }
  }

  return { error: null, booking }
}

async function getOrderActionText(locale?: Locale) {
  const resolved = locale || normalizeLocale(await getCurrentLocale())
  const dict = {
    id: {
      merchantMissing: "Data merchant tidak ditemukan",
      bookingMissing: "Booking tidak ditemukan",
      bookingNotOwned: "Booking bukan milik merchant ini",
      invalidBooking: "Booking tidak valid",
      arrivedNeedPayment: "Merchant hanya bisa klik Arrived setelah booking customer lunas",
      arrivedAlreadySent: "Status Arrived sudah pernah dikirim",
      arrivedSuccess: "Status Arrived berhasil dikirim ke customer dan admin",
      arrivedFirst: "Klik Arrived terlebih dahulu saat merchant sudah sampai meeting point",
      customerPickedUpFirst: "Customer harus klik Picked up terlebih dahulu sebelum merchant klik Go",
      goAlreadySent: "Status Go Confirmed sudah pernah dikirim",
      goReadyFinance: "Status Go Confirmed berhasil dikirim. Booking normal yang sudah lunas sekarang menunggu handoff admin ke finance.",
      goWaitingFullPaid: "Status Go Confirmed berhasil dikirim. Booking masih menunggu status Fully Paid.",
    },
    en: {
      merchantMissing: "Merchant data not found",
      bookingMissing: "Booking not found",
      bookingNotOwned: "This booking does not belong to the merchant",
      invalidBooking: "Invalid booking",
      arrivedNeedPayment: "Merchant can only click Arrived after the booking is fully paid",
      arrivedAlreadySent: "Arrived status has already been submitted",
      arrivedSuccess: "Arrived status was successfully sent to the customer and admin",
      arrivedFirst: "Click Arrived first when the merchant has arrived at the meeting point",
      customerPickedUpFirst: "The customer must click Picked up before the merchant can click Go",
      goAlreadySent: "Go Confirmed status has already been submitted",
      goReadyFinance: "Go Confirmed status was submitted successfully. Fully paid normal bookings are now waiting for admin handoff to finance.",
      goWaitingFullPaid: "Go Confirmed status was submitted successfully. The booking is still waiting for Fully Paid status.",
    },
    zh: {
      merchantMissing: "未找到商家数据",
      bookingMissing: "未找到预订",
      bookingNotOwned: "该预订不属于此商家",
      invalidBooking: "预订无效",
      arrivedNeedPayment: "只有在预订已全额付款后，商家才能点击 Arrived",
      arrivedAlreadySent: "Arrived 状态已提交过",
      arrivedSuccess: "Arrived 状态已成功发送给客户和管理员",
      arrivedFirst: "当商家已到达集合点时，请先点击 Arrived",
      customerPickedUpFirst: "在商家点击 Go 之前，客户必须先点击 Picked up",
      goAlreadySent: "Go Confirmed 状态已提交过",
      goReadyFinance: "Go Confirmed 状态提交成功。已全额付款的正常预订现在等待管理员移交给财务。",
      goWaitingFullPaid: "Go Confirmed 状态提交成功。该预订仍在等待 Fully Paid 状态。",
    },
  } satisfies Record<Locale, Record<string, string>>

  return dict[resolved]
}

function redirectBack(message: string, filter: string | null, type: "success" | "error"): never {
  const suffix = filter ? `?filter=${encodeURIComponent(filter)}&${type}=${encodeURIComponent(message)}` : `?${type}=${encodeURIComponent(message)}`
  redirect(`/merchant/pesanan${suffix}`)
}

export async function markMerchantArrived(formData: FormData) {
  const t = await getOrderActionText()
  const bookingId = String(formData.get("booking_id") || "")
  const filter = String(formData.get("filter") || "all")
  const supabase = await createClient("merchant")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/merchant/login")
  if (!bookingId) redirectBack(t.invalidBooking, filter, "error")

  const { error, booking } = await getMerchantOwnedBooking(bookingId, user.id)
  if (error || !booking) {
    const localizedError =
      error === "Data merchant tidak ditemukan"
        ? t.merchantMissing
        : error === "Booking bukan milik merchant ini"
          ? t.bookingNotOwned
          : t.bookingMissing
    redirectBack(localizedError, filter, "error")
  }

  const paymentStatus = normalizeStatus(booking.payment_status)
  if (paymentStatus !== "paid") {
    redirectBack(t.arrivedNeedPayment, filter, "error")
  }

  if (booking.merchant_arrived_at) {
    redirectBack(t.arrivedAlreadySent, filter, "success")
  }

  const adminSupabase = createAdminClient()
  const { error: updateError } = await adminSupabase
    .from("bookings")
    .update({
      merchant_arrived_at: new Date().toISOString(),
      booking_status: "merchant_arrived",
      escrow_status: "held",
    })
    .eq("id", bookingId)

  if (updateError) {
    redirectBack(updateError.message, filter, "error")
  }

  redirectBack(t.arrivedSuccess, filter, "success")
}

export async function markMerchantGo(formData: FormData) {
  const t = await getOrderActionText()
  const bookingId = String(formData.get("booking_id") || "")
  const filter = String(formData.get("filter") || "all")
  const supabase = await createClient("merchant")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/merchant/login")
  if (!bookingId) redirectBack(t.invalidBooking, filter, "error")

  const { error, booking } = await getMerchantOwnedBooking(bookingId, user.id)
  if (error || !booking) {
    const localizedError =
      error === "Data merchant tidak ditemukan"
        ? t.merchantMissing
        : error === "Booking bukan milik merchant ini"
          ? t.bookingNotOwned
          : t.bookingMissing
    redirectBack(localizedError, filter, "error")
  }

  if (!booking.merchant_arrived_at) {
    redirectBack(t.arrivedFirst, filter, "error")
  }

  if (!booking.customer_picked_up_at) {
    redirectBack(t.customerPickedUpFirst, filter, "error")
  }

  if (booking.merchant_picked_up_at) {
    redirectBack(t.goAlreadySent, filter, "success")
  }

  const paymentStatus = normalizeStatus(booking.payment_status)
  const readyForFinanceQueue = paymentStatus === "paid"
  const adminSupabase = createAdminClient()
  const { error: updateError } = await adminSupabase
    .from("bookings")
    .update({
      merchant_picked_up_at: new Date().toISOString(),
      booking_status: readyForFinanceQueue ? "awaiting_admin_handoff" : "pickup_completed_pending_final_payment",
      escrow_status: readyForFinanceQueue ? "awaiting_admin_handoff" : "partial_hold",
      escrow_released_at: null,
    })
    .eq("id", bookingId)

  if (updateError) {
    redirectBack(updateError.message, filter, "error")
  }

  redirectBack(
    readyForFinanceQueue
      ? t.goReadyFinance
      : t.goWaitingFullPaid,
    filter,
    "success",
  )
}

