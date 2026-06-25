import { calculateMerchantPayout, getFinanceSettings, resolveCustomerAdminFeePercent } from "@/lib/finance/settings"
import { formatBookingCode } from "@/lib/merchant-code"

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

type AdminSupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: <T = Record<string, unknown>>() => Promise<{ data: T | null; error: { message?: string } | null }>
        maybeSingle: <T = Record<string, unknown>>() => Promise<{ data: T | null; error: { message?: string } | null }>
      }
    }
    insert: (payload: Record<string, unknown> | Record<string, unknown>[]) => Promise<{ error: { message?: string } | null }>
    update: (payload: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: { message?: string } | null }>
    }
  }
}

type PayoutRow = {
  id?: string | null
  status?: string | null
}

type PackageRow = {
  merchant_id?: string | null
}

type MerchantRow = {
  id: string
  bank_name: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
}

type BookingForPayout = {
  id: string
  booking_code: string | null
  package_id: string | null
  subtotal_amount: number | null
  payment_method: string | null
  customer_tax_percent: number | null
  payment_status: string | null
  merchant_arrived_at: string | null
  customer_picked_up_at: string | null
  merchant_picked_up_at: string | null
  booking_status?: string | null
  escrow_status?: string | null
}

function hasActivePayoutStatus(value: string | null | undefined) {
  return ["pending", "approved", "processing", "paid"].includes(normalizeStatus(value))
}

export function isBookingEligibleForAutomaticFinanceHandoff(booking: BookingForPayout) {
  return (
    normalizeStatus(booking.payment_status) === "paid" &&
    Boolean(booking.merchant_arrived_at) &&
    Boolean(booking.customer_picked_up_at) &&
    Boolean(booking.merchant_picked_up_at)
  )
}

export async function detectAutomaticPayoutRedFlags(
  adminSupabase: AdminSupabaseLike,
  booking: BookingForPayout,
) {
  const reasons: string[] = []

  if (!isBookingEligibleForAutomaticFinanceHandoff(booking)) {
    reasons.push("Booking belum memenuhi syarat auto handoff")
    return { reasons, merchant: null as null | MerchantRow, existingPayout: null as null | PayoutRow }
  }

  if (!booking.package_id) {
    reasons.push("Package booking tidak ditemukan")
    return { reasons, merchant: null as null | MerchantRow, existingPayout: null as null | PayoutRow }
  }

  const { data: existingPayout } = await adminSupabase
    .from("payout_requests")
    .select("id, status")
    .eq("booking_id", booking.id)
    .maybeSingle<PayoutRow>()

  if (existingPayout?.id && hasActivePayoutStatus(existingPayout.status)) {
    reasons.push("Booking sudah memiliki payout aktif")
  }

  const { data: pkg } = await adminSupabase
    .from("packages")
    .select("merchant_id")
    .eq("id", booking.package_id)
    .single<PackageRow>()

  if (!pkg?.merchant_id) {
    reasons.push("Merchant package tidak ditemukan")
    return { reasons, merchant: null as null | MerchantRow, existingPayout }
  }

  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id, bank_name, bank_account_number, bank_account_holder")
    .eq("id", pkg.merchant_id)
    .single<MerchantRow>()

  if (!merchant) {
    reasons.push("Data merchant tidak ditemukan")
  } else {
    if (!merchant.bank_name) reasons.push("Nama bank merchant belum lengkap")
    if (!merchant.bank_account_number) reasons.push("Nomor rekening merchant belum lengkap")
    if (!merchant.bank_account_holder) reasons.push("Nama pemilik rekening merchant belum lengkap")
  }

  const subtotalAmount = Number(booking.subtotal_amount || 0)
  if (subtotalAmount <= 0) {
    reasons.push("Subtotal booking tidak valid")
  }

  return { reasons, merchant, existingPayout }
}

export async function createFinancePayoutHandoff(
  adminSupabase: AdminSupabaseLike,
  booking: BookingForPayout,
  options?: {
    source?: string
    notePrefix?: string
  },
) {
  const redFlagCheck = await detectAutomaticPayoutRedFlags(adminSupabase, booking)
  if (redFlagCheck.reasons.length > 0 || !redFlagCheck.merchant) {
    return {
      error: redFlagCheck.reasons[0] || "Booking belum siap untuk payout handoff",
      redFlags: redFlagCheck.reasons,
      payoutCreated: false,
    }
  }

  const settings = await getFinanceSettings(
    adminSupabase as unknown as Parameters<typeof getFinanceSettings>[0],
  )
  const payout = calculateMerchantPayout(
    Number(booking.subtotal_amount || 0),
    settings,
    redFlagCheck.merchant.bank_name,
  )
  const customerAdminFeePercent = resolveCustomerAdminFeePercent(booking.payment_method, settings)
  const source = options?.source || "admin_handoff"
  const notePrefix = options?.notePrefix || "Auto handoff dari admin"

  const payoutPayload: Record<string, unknown> = {
    merchant_id: redFlagCheck.merchant.id,
    booking_id: booking.id,
    amount: payout.netAmount,
    bank_name: redFlagCheck.merchant.bank_name,
    bank_account_number: redFlagCheck.merchant.bank_account_number,
    bank_account_holder: redFlagCheck.merchant.bank_account_holder,
    status: "pending",
    note: `${notePrefix} untuk booking ${formatBookingCode(booking.booking_code, booking.id)}. Basis payout subtotal paket ${payout.grossAmount}, komisi ${payout.redfengCommissionAmount}, biaya transfer ${payout.merchantTransferFee}.`,
    gross_booking_amount: payout.grossAmount,
    redfeng_commission_percent: payout.redfengCommissionPercent,
    redfeng_commission_amount: payout.redfengCommissionAmount,
    customer_admin_fee_percent: customerAdminFeePercent,
    customer_tax_percent: Number(booking.customer_tax_percent || settings.customerTaxPercent),
    merchant_transfer_fee: payout.merchantTransferFee,
    source,
  }

  const { error: payoutError } = await adminSupabase.from("payout_requests").insert(payoutPayload)
  if (payoutError) {
    return {
      error: payoutError.message || "Gagal membuat payout request",
      redFlags: [] as string[],
      payoutCreated: false,
    }
  }

  return {
    error: null,
    redFlags: [] as string[],
    payoutCreated: true,
    merchantId: redFlagCheck.merchant.id as string,
    payoutAmount: payout.netAmount,
    grossAmount: payout.grossAmount,
  }
}
