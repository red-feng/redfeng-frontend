"use client"

import { useRouter } from "next/navigation"
import { type ActivePortal, resolvePortalFromPathname } from "@/lib/portal-context"
import { createClient } from "@/lib/supabase/client"

type SignOutButtonProps = {
  className?: string
  label?: string
  redirectTo?: string
  portal?: ActivePortal
}

export default function SignOutButton({
  className = "",
  label = "Logout",
  redirectTo = "/",
  portal,
}: SignOutButtonProps) {
  const router = useRouter()
  const resolvedPortal = portal || (typeof window !== "undefined" ? resolvePortalFromPathname(window.location.pathname) : "customer")
  const supabase = createClient(resolvedPortal)

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
