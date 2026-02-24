import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1️⃣ Belum login
  if (!user) {
    redirect("/merchant/login")
  }

  // 2️⃣ Ambil profile (role only)
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (error || !profile) {
    redirect("/")
  }

  // 3️⃣ Pastikan merchant
  if (profile.role !== "merchant") {
    redirect("/")
  }

  // 4️⃣ Ambil merchant data
  const { data: merchant } = await supabase
    .from("merchants")
    .select("verification_status, onboarding_completed")
    .eq("user_id", user.id)
    .single()

  if (!merchant) {
    redirect("/merchant/onboarding")
  }

  // 5️⃣ Flow berdasarkan merchants table
  if (merchant.verification_status === "pending") {
    redirect("/merchant/pending")
  }

  if (merchant.verification_status === "rejected") {
    redirect("/merchant/rejected")
  }

  if (!merchant.onboarding_completed) {
    redirect("/merchant/onboarding")
  }

  return <>{children}</>
}