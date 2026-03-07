"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type SignOutButtonProps = {
  className?: string
  label?: string
}

export default function SignOutButton({
  className = "",
  label = "Logout",
}: SignOutButtonProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <button type="button" onClick={handleSignOut} className={className}>
      {label}
    </button>
  )
}
