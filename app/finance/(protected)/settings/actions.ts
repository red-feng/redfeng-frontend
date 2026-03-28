"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function ensureFinance() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/finance/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["finance_manager", "superadmin"].includes(profile.role || "")) {
    redirect("/finance/login")
  }
}

export async function saveFinanceSettings(formData: FormData) {
  await ensureFinance()

  const redfengCommissionPercent = Number(formData.get("redfeng_commission_percent") || 0)
  const customerAdminFeePercent = Number(formData.get("customer_admin_fee_percent") || 0)
  const customerTaxPercent = Number(formData.get("customer_tax_percent") || 0)
  const merchantTransferFee = Number(formData.get("merchant_transfer_fee") || 0)

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.from("finance_settings").upsert({
    id: "default",
    redfeng_commission_percent: redfengCommissionPercent,
    customer_admin_fee_percent: customerAdminFeePercent,
    customer_tax_percent: customerTaxPercent,
    merchant_transfer_fee: merchantTransferFee,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    redirect(`/finance/settings?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/finance/settings?success=Setting finance berhasil diperbarui")
}
