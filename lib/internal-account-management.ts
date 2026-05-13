import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export function resolveReturnTo(formData: FormData, fallbackPath: string) {
  const returnTo = String(formData.get("return_to") || "").trim()
  return returnTo.startsWith("/") ? returnTo : fallbackPath
}

export function redirectWithMessage(path: string, message: string, type: "success" | "error"): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`)
}

export function formatAccountErrorMessage(message: string, requestedRole: string) {
  if (message.includes("profiles_role_check")) {
    return `Database role internal belum mengenali role ${requestedRole}. Jalankan migration profiles role terbaru terlebih dahulu.`
  }
  return message
}

export async function getInternalManagerActor(returnTo?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const loginPath = returnTo?.startsWith("/superadmin")
    ? "/superadmin/login"
    : returnTo?.startsWith("/finance")
      ? "/finance/login"
      : returnTo?.startsWith("/marketing")
        ? "/marketing/login"
      : "/admin/login"

  if (!user) {
    redirect(loginPath)
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["admin", "operations_manager", "finance", "finance_manager", "marketing", "marketing_manager", "superadmin"].includes(profile.role || "")) {
    redirect(loginPath)
  }

  return {
    id: user.id,
    role: profile.role,
  }
}
