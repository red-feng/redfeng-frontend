import { redirect } from "next/navigation"
import { createClient } from "../../lib/supabase/server"

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient() // ✅ WAJIB await

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "merchant") {
    redirect("/")
  }

  return <>{children}</>
}