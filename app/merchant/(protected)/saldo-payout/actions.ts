"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function isEligibleForPayout(booking: {
  payment_status: string | null
  escrow_status: string | null
}) {
  return normalizeStatus(booking.payment_status) === "paid" && normalizeStatus(booking.escrow_status) === "ready_for_payout"
}

export async function requestPayout(formData: FormData) {
  const amount = Number(formData.get("amount") || 0)
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/merchant/login")
  }

  const { data: merchant } = await adminSupabase
    .from("merchants")
    .select("id, bank_name, bank_account_number, bank_account_holder")
    .eq("user_id", user.id)
    .single()

  if (!merchant) {
    redirect("/merchant/saldo-payout?error=Data merchant tidak ditemukan")
  }

  if (!amount || amount <= 0) {
    redirect("/merchant/saldo-payout?error=Nominal payout tidak valid")
  }

  const { data: merchantPackages } = await adminSupabase
    .from("packages")
    .select("id")
    .eq("merchant_id", merchant.id)

  const packageIds = (merchantPackages || []).map((pkg) => pkg.id).filter(Boolean)

  if (packageIds.length === 0) {
    redirect("/merchant/saldo-payout?error=Belum ada paket merchant yang dapat diproses")
  }

  const { data: bookingsData } = await adminSupabase
    .from("bookings")
    .select("total_amount, payment_status, escrow_status")
    .in("package_id", packageIds)

  const bookings = bookingsData || []
  const grossAvailable = bookings
    .filter(isEligibleForPayout)
    .reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0)

  const { data: payoutData } = await adminSupabase
    .from("payout_requests")
    .select("amount, status")
    .eq("merchant_id", merchant.id)

  const reservedPayout = (payoutData || [])
    .filter((item) => {
      const status = normalizeStatus(item.status)
      return status === "pending" || status === "approved" || status === "processing"
    })
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const availableBalance = grossAvailable - reservedPayout

  if (amount > availableBalance) {
    redirect("/merchant/saldo-payout?error=Nominal melebihi saldo yang sudah approved RedFeng")
  }

  const { error } = await adminSupabase.from("payout_requests").insert({
    merchant_id: merchant.id,
    amount,
    bank_name: merchant.bank_name,
    bank_account_number: merchant.bank_account_number,
    bank_account_holder: merchant.bank_account_holder,
    status: "pending",
  })

  if (error) {
    redirect(`/merchant/saldo-payout?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/merchant/saldo-payout?success=Request payout berhasil dikirim")
}
