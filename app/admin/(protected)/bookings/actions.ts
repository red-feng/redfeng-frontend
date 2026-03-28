"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { calculateMerchantPayout, getFinanceSettings, resolveCustomerAdminFeePercent } from "@/lib/finance/settings"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { isAdminExecutionRole } from "@/lib/internal-roles"

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

async function ensureAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || !isAdminExecutionRole(profile.role)) {
    redirect("/admin/login")
  }

  return {
    user,
    role: profile.role,
  }
}

function backToBookings(message: string, type: "success" | "error"): never {
  redirect(`/admin/bookings?${type}=${encodeURIComponent(message)}`)
}

export async function handoffBookingToFinance(formData: FormData) {
  const adminActor = await ensureAdmin()

  const bookingId = String(formData.get("booking_id") || "")
  if (!bookingId) {
    backToBookings("Booking tidak valid", "error")
  }

  const adminSupabase = createAdminClient()
  const { data: booking, error: bookingError } = await adminSupabase
    .from("bookings")
    .select(
      "id, booking_code, package_id, total_amount, subtotal_amount, payment_method, customer_tax_percent, payment_status, merchant_arrived_at, merchant_picked_up_at, customer_picked_up_at, booking_status",
    )
    .eq("id", bookingId)
    .single()

  if (bookingError || !booking) {
    backToBookings("Booking tidak ditemukan", "error")
  }

  if (normalizeStatus(booking.payment_status) !== "paid") {
    backToBookings("Booking belum berstatus Fully Paid sehingga belum bisa dikirim ke finance", "error")
  }

  if (!booking.merchant_arrived_at || !booking.customer_picked_up_at || !booking.merchant_picked_up_at) {
    backToBookings("Urutan Arrived, Picked up, dan Go belum lengkap", "error")
  }

  if (normalizeStatus(booking.booking_status) === "finance_review") {
    backToBookings("Booking ini sudah berstatus Ready for Finance", "success")
  }

  const { data: existingPayout } = await adminSupabase
    .from("payout_requests")
    .select("id, status")
    .eq("booking_id", booking.id)
    .maybeSingle()

  if (existingPayout?.id && ["pending", "approved", "processing", "paid"].includes(normalizeStatus(existingPayout.status))) {
    backToBookings("Booking ini sudah memiliki antrean payout aktif", "success")
  }

  const { data: pkg } = await adminSupabase
    .from("packages")
    .select("merchant_id")
    .eq("id", booking.package_id)
    .single()

  if (!pkg?.merchant_id) {
    backToBookings("Merchant untuk booking ini tidak ditemukan", "error")
  }

  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id, bank_name, bank_account_number, bank_account_holder")
    .eq("id", pkg.merchant_id)
    .single()

  if (!merchant) {
    backToBookings("Rekening merchant belum tersedia", "error")
  }

  const settings = await getFinanceSettings(
    adminSupabase as unknown as Parameters<typeof getFinanceSettings>[0],
  )
  const payout = calculateMerchantPayout(
    Number(booking.subtotal_amount || 0),
    settings,
    merchant.bank_name,
  )
  const customerAdminFeePercent = resolveCustomerAdminFeePercent(booking.payment_method, settings)

  const payoutPayload: Record<string, unknown> = {
    merchant_id: merchant.id,
    booking_id: booking.id,
    amount: payout.netAmount,
    bank_name: merchant.bank_name,
    bank_account_number: merchant.bank_account_number,
    bank_account_holder: merchant.bank_account_holder,
    status: "pending",
    note: `Auto handoff dari admin untuk booking ${booking.booking_code || booking.id}. Basis payout subtotal paket ${payout.grossAmount}, komisi ${payout.redfengCommissionAmount}, biaya transfer ${payout.merchantTransferFee}.`,
    gross_booking_amount: payout.grossAmount,
    redfeng_commission_percent: payout.redfengCommissionPercent,
    redfeng_commission_amount: payout.redfengCommissionAmount,
    customer_admin_fee_percent: customerAdminFeePercent,
    customer_tax_percent: Number(booking.customer_tax_percent || settings.customerTaxPercent),
    merchant_transfer_fee: payout.merchantTransferFee,
    source: "admin_handoff",
  }

  const { error: payoutError } = await adminSupabase.from("payout_requests").insert(payoutPayload as never)

  if (payoutError) {
    backToBookings(payoutError.message, "error")
  }

  const { error: updateError } = await adminSupabase
    .from("bookings")
    .update({
      booking_status: "finance_review",
      escrow_status: "finance_review",
    })
    .eq("id", booking.id)

  if (updateError) {
    backToBookings(updateError.message, "error")
  }

  await createAdminAuditLog({
    actorId: adminActor.user.id,
    actorRole: adminActor.role,
    targetType: "booking",
    targetId: booking.id,
    action: "handoff_to_finance",
    summary: `Booking ${booking.booking_code || booking.id} dikirim ke finance`,
    metadata: {
      bookingCode: booking.booking_code,
      payoutAmount: payout.netAmount,
      grossAmount: payout.grossAmount,
      merchantId: merchant.id,
      source: "admin_handoff",
    },
  })

  backToBookings("Booking berhasil dikirim ke finance dan sekarang berstatus Ready for Finance", "success")
}
