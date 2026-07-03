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

export async function saveFinanceSettings(formData: FormData) {
  const portal = resolvePortal(formData)
  await ensureFinance(portal)

  const redfengCommissionPercent = Number(formData.get("redfeng_commission_percent") || 0)
  const bankTransferFeePercent = Number(formData.get("customer_admin_fee_bank_transfer_percent") || 0)
  const qrisFeePercent = Number(formData.get("customer_admin_fee_qris_percent") || 0)
  const creditCardFeePercent = Number(formData.get("customer_admin_fee_credit_card_percent") || 0)
  const customerTaxPercent = Number(formData.get("customer_tax_percent") || 0)
  const merchantTransferFee = Number(formData.get("merchant_transfer_fee") || 0)
  const flightMarkupFlatAmount = Number(formData.get("flight_markup_flat_amount") || 0)
  const flightMarkupPercent = Number(formData.get("flight_markup_percent") || 0)
  const flightMinimumMarginAmount = Number(formData.get("flight_minimum_margin_amount") || 0)
  const merchantTransferFeeRules = Object.fromEntries(
    merchantTransferBanks.map((bankKey) => [
      bankKey,
      Number(formData.get(`merchant_transfer_fee_${bankKey}`) || merchantTransferFee || 0),
    ]),
  )
  const customerAdminFeeRules = {
    bank_transfer: bankTransferFeePercent,
    qris: qrisFeePercent,
    credit_card: creditCardFeePercent,
    flight_markup_flat_amount: Math.max(Math.round(flightMarkupFlatAmount), 0),
    flight_markup_percent: Math.max(flightMarkupPercent, 0),
    flight_minimum_margin_amount: Math.max(Math.round(flightMinimumMarginAmount), 0),
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
