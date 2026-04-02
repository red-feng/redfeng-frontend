import { NextResponse } from "next/server"
import midtransClient from "midtrans-client"
import { createClient } from "@supabase/supabase-js"
import { getRequiredEnv } from "@/lib/env"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { resolveActiveCustomerPaymentMethod } from "@/lib/finance/settings"
import { deleteDraftBooking, isDraftBookingDeletable } from "@/lib/bookings/draft-cleanup"
import { formatFinalPaymentDueLabel, isFinalPaymentOverdue } from "@/lib/booking/final-payment-deadline"
import { normalizeLocale, type Locale } from "@/lib/i18n"

function resolveEnabledPayments(paymentMethod: string | null | undefined) {
  const normalizedMethod = resolveActiveCustomerPaymentMethod(paymentMethod)
  if (normalizedMethod === "qris") return ["qris", "gopay"]
  if (normalizedMethod === "credit_card") return ["credit_card"]
  return ["bank_transfer"]
}

function createOrderId(bookingCode: string | null | undefined, paymentType: string) {
  const baseCode = String(bookingCode || "").trim()
  const fallbackCode = `booking-${Date.now()}`
  return `${baseCode || fallbackCode}-${paymentType}-${Date.now()}`
}

type BookingParticipantRow = {
  participant_type: "adult" | "child"
  sequence_no: number
}

function hasExpectedParticipants(
  participants: BookingParticipantRow[],
  counts: {
    adult: number
    child: number
  },
) {
  const expectedKeys = new Set<string>()

  for (let index = 1; index <= counts.adult; index += 1) {
    expectedKeys.add(`adult:${index}`)
  }

  for (let index = 1; index <= counts.child; index += 1) {
    expectedKeys.add(`child:${index}`)
  }

  if (expectedKeys.size === 0 || participants.length !== expectedKeys.size) {
    return false
  }

  return participants.every((participant) =>
    expectedKeys.has(`${participant.participant_type}:${participant.sequence_no}`),
  )
}

function paymentCreateCopy(locale: Locale) {
  if (locale === "en") {
    return {
      loginRequired: "Please log in first.",
      bookingNotFound: "Booking not found.",
      alreadyPaid: "This booking has already been fully paid.",
      notOwner: "This booking does not belong to your account.",
      invalidParticipants: "This booking does not yet have a valid participant count.",
      participantVerificationFailed: "Participant data could not be verified.",
      participantsIncomplete: "Please complete all participant data before opening payment.",
      overdueFinalPayment: (dueLabel: string) => `The final payment deadline has passed. Final payment can only be made until ${dueLabel}.`,
      paymentRecordFailed: "Failed to create payment record.",
      popupFailedCleanup: "The payment popup could not be opened. The draft booking was cleaned up automatically.",
      serverError: "Server error.",
    }
  }
  if (locale === "zh") {
    return {
      loginRequired: "请先登录。",
      bookingNotFound: "未找到订单。",
      alreadyPaid: "该订单已完成全额付款。",
      notOwner: "该订单不属于您的账号。",
      invalidParticipants: "该订单尚未有有效的参团人数。",
      participantVerificationFailed: "无法验证参团人资料。",
      participantsIncomplete: "请先完善所有参团人资料后再打开付款。",
      overdueFinalPayment: (dueLabel: string) => `尾款期限已过，尾款只能在 ${dueLabel} 前支付。`,
      paymentRecordFailed: "创建付款记录失败。",
      popupFailedCleanup: "无法打开付款弹窗，草稿订单已自动清理。",
      serverError: "服务器错误。",
    }
  }
  return {
    loginRequired: "Silakan login terlebih dahulu",
    bookingNotFound: "Booking tidak ditemukan",
    alreadyPaid: "Booking ini sudah lunas",
    notOwner: "Booking ini bukan milik akun Anda",
    invalidParticipants: "Booking ini belum memiliki jumlah peserta yang valid",
    participantVerificationFailed: "Data peserta belum bisa diverifikasi",
    participantsIncomplete: "Lengkapi data seluruh peserta sebelum membuka pembayaran.",
    overdueFinalPayment: (dueLabel: string) => `Batas pelunasan sudah lewat. Pelunasan hanya bisa dilakukan sampai ${dueLabel}.`,
    paymentRecordFailed: "Gagal membuat payment record",
    popupFailedCleanup: "Popup pembayaran belum bisa dibuka. Draft booking dibersihkan otomatis.",
    serverError: "Server error",
  }
}

export async function POST(req: Request) {
  try {
    const { booking_id, locale } = await req.json()
    const activeLocale = normalizeLocale(locale)
    const t = paymentCreateCopy(activeLocale)
    const authSupabase = await createServerClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t.loginRequired }, { status: 401 })
    }

    const supabase = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
    )

    // ===============================
    // 1️⃣ Ambil booking
    // ===============================
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single()

    if (error || !booking) {
      return NextResponse.json(
        { error: t.bookingNotFound },
        { status: 404 }
      )
    }

    if (booking.payment_status === "paid") {
      return NextResponse.json(
        { error: t.alreadyPaid },
        { status: 400 }
      )
    }

    const bookingOwnerEmail = String(booking.customer_email || "").trim().toLowerCase()
    const signedInEmail = String(user.email || "").trim().toLowerCase()

    if (booking.user_id && booking.user_id !== user.id) {
      return NextResponse.json(
        { error: t.notOwner },
        { status: 403 }
      )
    }

    if (!booking.user_id && bookingOwnerEmail && signedInEmail && bookingOwnerEmail !== signedInEmail) {
      return NextResponse.json(
        { error: t.notOwner },
        { status: 403 }
      )
    }

    const adultCount = Math.max(Number(booking.adult_count || 0), 0)
    const childCount = Math.max(Number(booking.child_count || 0), 0)
    const expectedParticipantCount = adultCount + childCount

    if (expectedParticipantCount <= 0) {
      return NextResponse.json(
        { error: t.invalidParticipants },
        { status: 400 }
      )
    }

    const { data: participantRows, error: participantError } = await supabase
      .from("booking_participants")
      .select("participant_type, sequence_no")
      .eq("booking_id", booking.id)
      .order("participant_type", { ascending: true })
      .order("sequence_no", { ascending: true })

    if (participantError) {
      return NextResponse.json(
        { error: t.participantVerificationFailed },
        { status: 500 }
      )
    }

    const hasCompleteParticipants = hasExpectedParticipants(
      (participantRows as BookingParticipantRow[] | null) || [],
      {
        adult: adultCount,
        child: childCount,
      }
    )

    if (!hasCompleteParticipants) {
      return NextResponse.json(
        { error: t.participantsIncomplete },
        { status: 400 }
      )
    }

    // ===============================
    // 2️⃣ Tentukan amount
    // ===============================
    const hasPaidDp = booking.payment_type === "dp" && booking.payment_status === "dp_paid"
    let amount = booking.total_amount
    let paymentType = booking.payment_type || "full"
    const financePaymentMethod = resolveActiveCustomerPaymentMethod(booking.payment_method)

    if (hasPaidDp && isFinalPaymentOverdue(booking.pickup_date || null)) {
      return NextResponse.json(
        {
          error: t.overdueFinalPayment(formatFinalPaymentDueLabel(booking.pickup_date || null)),
        },
        { status: 400 }
      )
    }

    if (hasPaidDp) {
      paymentType = "full"
      amount = Math.max(Number(booking.final_payment_amount || 0), 0)
    } else if (booking.payment_type === "dp") {
      amount = booking.dp_amount
    }

    // ===============================
    // 3️⃣ Generate Order ID
    // ===============================
    const orderId = createOrderId(booking.booking_code, paymentType)

    // ===============================
    // 4️⃣ Simpan ke table payments
    // ===============================
    const { error: paymentError } = await supabase
  .from("payments")
  .insert({
    booking_id: booking.id,
    order_id: orderId,
    payment_type: paymentType,
    finance_payment_method: financePaymentMethod,
    gross_amount: amount,
    transaction_status: "pending"
  })

    if (paymentError) {
      return NextResponse.json(
        { error: paymentError.message || t.paymentRecordFailed },
        { status: 500 }
      )
    }

    // ===============================
    // 5️⃣ Create Midtrans Snap
    // ===============================
    const snap = new midtransClient.Snap({
      isProduction: true,
      serverKey: getRequiredEnv("MIDTRANS_SERVER_KEY")
    })

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      enabled_payments: resolveEnabledPayments(financePaymentMethod),
      customer_details: {
        first_name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone
      }
    }

    let transaction: { token: string }

    try {
      transaction = await snap.createTransaction(parameter)
    } catch (gatewayError) {
      if (!hasPaidDp && isDraftBookingDeletable(booking)) {
        await deleteDraftBooking(supabase, booking.id)
      } else {
        await supabase.from("payments").delete().eq("booking_id", booking.id).eq("order_id", orderId)
      }

      return NextResponse.json(
        {
          error:
            gatewayError instanceof Error
              ? gatewayError.message
              : t.popupFailedCleanup,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      snap_token: transaction.token,
      snap_mode: financePaymentMethod === "qris" ? "qr" : "auto",
      order_id: orderId,
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : t.serverError },
      { status: 500 }
    )
  }
}
