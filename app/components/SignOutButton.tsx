"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type SignOutButtonProps = {
  className?: string
  label?: string
  redirectTo?: string
}

export default function SignOutButton({
  className = "",
  label = "Logout",
  redirectTo = "/",
}: SignOutButtonProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    if (/^https?:\/\//.test(redirectTo)) {
      window.location.assign(redirectTo)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <button type="button" onClick={handleSignOut} className={className}>
      {label}
    </button>
  )
}
