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

  if (!user) {
    redirect("/merchant/login")
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single()

  // kalau error atau profile tidak ada
  if (error || !profile) {
    redirect("/")
  }

  // kalau bukan merchant
  if (profile.role !== "merchant") {
    redirect("/")
  }

  // kalau belum approved
  if (profile.status !== "approved") {
    redirect("/merchant/pending")
  }

  return <>{children}</>
}