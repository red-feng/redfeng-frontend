"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const merchantTransferBanks = ["default", "bca", "bni", "bri", "mandiri", "permata", "cimb", "bsi"] as const

type FinancePortal = "finance" | "superadmin"

function resolvePortal(formData: FormData): FinancePortal {
  return String(formData.get("portal") || "").trim() === "superadmin" ? "superadmin" : "finance"
}

function resolvePortalPaths(portal: FinancePortal) {
  return {
    loginPath: portal === "superadmin" ? "/superadmin/login" : "/finance/login",
    settingsPath: portal === "superadmin" ? "/superadmin/finance-settings" : "/finance/settings",
  }
}

async function ensureFinance(portal: FinancePortal) {
  const supabase = await createClient(portal)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { loginPath } = resolvePortalPaths(portal)

  if (!user) {
    redirect(loginPath)
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || profile.role !== "finance_manager") {
    redirect(loginPath)
  }
}

function parseFinanceNumber(value: FormDataEntryValue | null, fallback = 0) {
  const normalized = String(value ?? "").trim().replace(",", ".")
  const parsed = Number(normalized || fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function saveFinanceSettings(formData: FormData) {
  const portal = resolvePortal(formData)
  await ensureFinance(portal)

  const redfengCommissionPercent = parseFinanceNumber(formData.get("redfeng_commission_percent"))
  const bankTransferFeePercent = parseFinanceNumber(formData.get("customer_admin_fee_bank_transfer_percent"))
  const qrisFeePercent = parseFinanceNumber(formData.get("customer_admin_fee_qris_percent"))
  const creditCardFeePercent = parseFinanceNumber(formData.get("customer_admin_fee_credit_card_percent"))
  const customerTaxPercent = parseFinanceNumber(formData.get("customer_tax_percent"))
  const merchantTransferFee = parseFinanceNumber(formData.get("merchant_transfer_fee"))
  const flightMarkupPercent = parseFinanceNumber(formData.get("flight_markup_percent"), 2)
  const flightMinimumMarginAmount = parseFinanceNumber(formData.get("flight_minimum_margin_amount"), 20000)
  const flightMaximumMarginAmount = parseFinanceNumber(formData.get("flight_maximum_margin_amount"), 75000)
  const merchantTransferFeeRules = Object.fromEntries(
    merchantTransferBanks.map((bankKey) => [
      bankKey,
      parseFinanceNumber(formData.get(`merchant_transfer_fee_${bankKey}`), merchantTransferFee),
    ]),
  )
  const normalizedFlightMinimumMarginAmount = Math.max(Math.round(flightMinimumMarginAmount), 0)
  const customerAdminFeeRules = {
    bank_transfer: bankTransferFeePercent,
    qris: qrisFeePercent,
    credit_card: creditCardFeePercent,
    flight_markup_percent: Math.max(flightMarkupPercent, 0),
    flight_minimum_margin_amount: normalizedFlightMinimumMarginAmount,
    flight_maximum_margin_amount: Math.max(
      Math.round(flightMaximumMarginAmount),
      normalizedFlightMinimumMarginAmount,
    ),
  }

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.from("finance_settings").upsert({
    id: "default",
    redfeng_commission_percent: redfengCommissionPercent,
    customer_admin_fee_percent: bankTransferFeePercent,
    customer_tax_percent: customerTaxPercent,
    merchant_transfer_fee: merchantTransferFee,
    customer_admin_fee_rules: customerAdminFeeRules,
    merchant_transfer_fee_rules: merchantTransferFeeRules,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    redirect(`${resolvePortalPaths(portal).settingsPath}?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`${resolvePortalPaths(portal).settingsPath}?success=Setting finance berhasil diperbarui`)
}
