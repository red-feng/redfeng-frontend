"use server"

import { redirect } from "next/navigation"
import type { Locale } from "@/lib/i18n"
import { createAdminClient } from "@/lib/supabase/admin"

const copy = {
  id: {
    invalidEmail: "Masukkan alamat email yang valid.",
    failed: "Newsletter belum bisa diproses. Coba lagi sebentar.",
    success: "Terima kasih. Email Anda sudah masuk ke daftar newsletter RedFeng.",
  },
  en: {
    invalidEmail: "Enter a valid email address.",
    failed: "We could not process the newsletter request yet. Please try again shortly.",
    success: "Thank you. Your email has been added to the RedFeng newsletter list.",
  },
  zh: {
    invalidEmail: "请输入有效的邮箱地址。",
    failed: "暂时无法处理订阅请求，请稍后再试。",
    success: "谢谢，您的邮箱已加入 RedFeng newsletter 列表。",
  },
} satisfies Record<Locale, { invalidEmail: string; failed: string; success: string }>

function normalizeLocale(value: string): Locale {
  if (value === "en" || value === "zh") return value
  return "id"
}

function normalizeRedirectPath(value: string) {
  if (value === "/packages") return value
  return "/"
}

function buildRedirectUrl(pathname: string, key: "newsletter_success" | "newsletter_error", value: string) {
  const params = new URLSearchParams()
  params.set(key, value)
  return `${pathname}?${params.toString()}#newsletter`
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function subscribeToNewsletter(formData: FormData) {
  const locale = normalizeLocale(String(formData.get("locale") || "id"))
  const redirectPath = normalizeRedirectPath(String(formData.get("redirect_path") || "/"))
  const email = String(formData.get("email") || "").trim().toLowerCase()
  const t = copy[locale]

  if (!isValidEmail(email)) {
    redirect(buildRedirectUrl(redirectPath, "newsletter_error", t.invalidEmail))
  }

  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()

  const { error } = await supabase.from("newsletter_subscribers").upsert(
    {
      email,
      locale,
      source_path: redirectPath,
      status: "active",
      subscribed_at: nowIso,
      updated_at: nowIso,
    },
    {
      onConflict: "email",
      ignoreDuplicates: false,
    },
  )

  if (error) {
    redirect(buildRedirectUrl(redirectPath, "newsletter_error", t.failed))
  }

  redirect(buildRedirectUrl(redirectPath, "newsletter_success", t.success))
}
