import { createAdminClient } from "@/lib/supabase/admin"
import {
  calculateMerchantPayout,
  getFinanceSettings,
  resolveCustomerAdminFeePercent,
} from "@/lib/finance/settings"
import { formatBookingCode } from "@/lib/merchant-code"

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

type AdminLikeClient = {
  from: ReturnType<typeof createAdminClient>["from"]
}

type QueueSource = "admin_handoff" | "merchant_go_auto" | "payment_settlement_auto"

type QueueBookingToFinanceParams = {
  adminSupabase?: AdminLikeClient
  bookingId: string
  source: QueueSource
}

function buildQueueNote(source: QueueSource, bookingCode: string, payout: ReturnType<typeof calculateMerchantPayout>) {
  const breakdown = `Basis payout subtotal paket ${payout.grossAmount}, komisi ${payout.redfengCommissionAmount}, biaya transfer ${payout.merchantTransferFee}.`

  if (source === "merchant_go_auto") {
    return `Auto handoff sistem setelah merchant klik Go untuk booking ${bookingCode}. ${breakdown}`
  }

  if (source === "payment_settlement_auto") {
    return `Auto handoff sistem setelah pelunasan / full payment sukses untuk booking ${bookingCode} yang pickup-nya sudah lengkap. ${breakdown}`
  }

  return `Auto handoff dari admin untuk booking ${bookingCode}. ${breakdown}`
}

export function isBookingReadyForAutomaticFinanceQueue(booking: {
  payment_status: string | null
  merchant_arrived_at?: string | null
  customer_picked_up_at?: string | null
  merchant_picked_up_at?: string | null
}) {
  return (
    normalizeStatus(booking.payment_status) === "paid" &&
    Boolean(booking.merchant_arrived_at) &&
    Boolean(booking.customer_picked_up_at) &&
    Boolean(booking.merchant_picked_up_at)
  )
}

export async function queueBookingToFinance({
  adminSupabase = createAdminClient(),
  bookingId,
  source,
}: QueueBookingToFinanceParams) {
  const { data: booking, error: bookingError } = await adminSupabase
    .from("bookings")
    .select(
      "id, booking_code, package_id, subtotal_amount, payment_method, customer_tax_percent, payment_status, booking_status, escrow_status, merchant_arrived_at, customer_picked_up_at, merchant_picked_up_at",
    )
    .eq("id", bookingId)
    .single()

  if (bookingError || !booking) {
    return { ok: false as const, error: "Booking tidak ditemukan" }
  }

  if (!isBookingReadyForAutomaticFinanceQueue(booking)) {
    return { ok: false as const, error: "Booking belum siap masuk queue finance" }
  }

  const bookingStatus = normalizeStatus(booking.booking_status)
  const escrowStatus = normalizeStatus(booking.escrow_status)

  if (
    ["finance_review", "finance_approved", "finance_processing", "payout_completed"].includes(bookingStatus) ||
    ["finance_review", "payout_processing", "paid_out"].includes(escrowStatus)
  ) {
    return { ok: true as const, alreadyQueued: true as const, booking }
  }

  const { data: existingPayout } = await adminSupabase
    .from("payout_requests")
    .select("id, status")
    .eq("booking_id", booking.id)
    .maybeSingle()

  const existingPayoutStatus = normalizeStatus(existingPayout?.status)
  if (existingPayout?.id && ["pending", "approved", "processing", "paid", "completed"].includes(existingPayoutStatus)) {
    await adminSupabase
      .from("bookings")
      .update({
        booking_status: existingPayoutStatus === "paid" || existingPayoutStatus === "completed" ? "payout_completed" : "finance_review",
        escrow_status: existingPayoutStatus === "paid" || existingPayoutStatus === "completed" ? "paid_out" : "finance_review",
      })
      .eq("id", booking.id)

    return { ok: true as const, alreadyQueued: true as const, booking }
  }

  const { data: pkg } = await adminSupabase.from("packages").select("merchant_id").eq("id", booking.package_id).single()

  if (!pkg?.merchant_id) {
    return { ok: false as const, error: "Merchant untuk booking ini tidak ditemukan" }
  }

  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id, bank_name, bank_account_number, bank_account_holder")
    .eq("id", pkg.merchant_id)
    .single()

  if (!merchant) {
    return { ok: false as const, error: "Rekening merchant belum tersedia" }
  }

  const settings = await getFinanceSettings(adminSupabase as unknown as Parameters<typeof getFinanceSettings>[0])
  const payout = calculateMerchantPayout(Number(booking.subtotal_amount || 0), settings, merchant.bank_name)
  const customerAdminFeePercent = resolveCustomerAdminFeePercent(booking.payment_method, settings)

  const { error: payoutError } = await adminSupabase.from("payout_requests").insert({
    merchant_id: merchant.id,
    booking_id: booking.id,
    amount: payout.netAmount,
    bank_name: merchant.bank_name,
    bank_account_number: merchant.bank_account_number,
    bank_account_holder: merchant.bank_account_holder,
    status: "pending",
    note: buildQueueNote(source, formatBookingCode(booking.booking_code, booking.id), payout),
    gross_booking_amount: payout.grossAmount,
    redfeng_commission_percent: payout.redfengCommissionPercent,
    redfeng_commission_amount: payout.redfengCommissionAmount,
    customer_admin_fee_percent: customerAdminFeePercent,
    customer_tax_percent: Number(booking.customer_tax_percent || settings.customerTaxPercent),
    merchant_transfer_fee: payout.merchantTransferFee,
    source,
  })

  if (payoutError) {
    return { ok: false as const, error: payoutError.message }
  }

  const { error: updateError } = await adminSupabase
    .from("bookings")
    .update({
      booking_status: "finance_review",
      escrow_status: "finance_review",
    })
    .eq("id", booking.id)

  if (updateError) {
    return { ok: false as const, error: updateError.message }
  }

  return { ok: true as const, alreadyQueued: false as const, booking, merchantId: merchant.id, payoutAmount: payout.netAmount, grossAmount: payout.grossAmount }
}
