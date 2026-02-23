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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single()

  // 2️⃣ Tidak ada profile
  if (error || !profile) {
    redirect("/")
  }

  // 3️⃣ Bukan merchant
  if (profile.role !== "merchant") {
    redirect("/")
  }

  // 4️⃣ Status flow handling
  if (profile.status === "pending") {
    redirect("/merchant/onboarding")
  }

  if (profile.status === "verification") {
    redirect("/merchant/pending")
  }

  if (profile.status === "rejected") {
    redirect("/merchant/rejected")
  }

  // 5️⃣ Hanya approved boleh masuk dashboard
  if (profile.status !== "approved") {
    redirect("/")
  }

  return <>{children}</>
}