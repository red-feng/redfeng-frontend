import Image from "next/image"
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import MerchantLanguageSwitcher from "@/app/components/MerchantLanguageSwitcher"
import { normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { formatCustomerCode } from "@/lib/merchant-code"
import { isAdminPortalRole, isFinancePortalRole } from "@/lib/internal-roles"
import { createClient } from "@/lib/supabase/server"
import SignOutButton from "@/app/components/SignOutButton"

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/customer/dashboard")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const activePortal = cookieStore.get("rf_active_portal")?.value || ""

  if (!profile) {
    await supabase.from("profiles").upsert({
      id: user.id,
      role: "customer",
    })
  } else if (profile.role === "superadmin") {
    redirect("/superadmin/login")
  } else if (isAdminPortalRole(profile.role)) {
    redirect("/admin/login")
  } else if (isFinancePortalRole(profile.role)) {
    redirect("/finance/login")
  } else if (profile.role === "merchant") {
    if (activePortal !== "customer") {
      redirect("/merchant/dashboard")
    }
  } else if (profile.role !== "customer") {
    redirect("/login")
  }

  const customerCode = formatCustomerCode(user.id)
  const locale = normalizeLocale(await getCurrentLocale())
  const languageLabel = locale === "en" ? "Language" : locale === "zh" ? "语言" : "Bahasa"
  const chatLabel = locale === "en" ? "Chat" : locale === "zh" ? "聊天" : "Chat"
  const languageOptions = [
    { value: "id" as const, label: "Bahasa Indonesia" },
    { value: "en" as const, label: "English" },
    { value: "zh" as const, label: "中文" },
  ]
  const { data: chatRooms } = await supabase
    .from("package_chat_rooms")
    .select("id, last_message_at, last_message_sender_id, customer_last_read_at")
    .eq("customer_id", user.id)
    .order("updated_at", { ascending: false })

  const customerChatBadgeCount =
    ((chatRooms as Array<{
      id: string
      last_message_at: string | null
      last_message_sender_id: string | null
      customer_last_read_at: string | null
    }> | null) || []).filter((room) => {
      if (!room.last_message_sender_id || room.last_message_sender_id === user.id) return false
      if (!room.last_message_at) return false
      if (!room.customer_last_read_at) return true
      return room.last_message_at > room.customer_last_read_at
    }).length

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)]">
      <header className="sticky top-0 z-40 border-b border-orange-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:px-10 md:py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/customer/dashboard" className="inline-flex items-center">
              <Image
                src="/logo-redfeng.png"
                alt="RedFeng"
                width={220}
                height={64}
                priority
                className="h-11 w-auto sm:h-12 md:h-14 lg:h-16"
              />
            </Link>
            <div className="hidden h-10 w-px bg-[#ead8c0] lg:block" />
            <div className="hidden lg:block">
              <p className="inline-flex rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">
                Customer Space
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">Dashboard customer Red Feng</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-600">{customerCode}</p>
              <p className="text-xs text-slate-500">Area booking, pembayaran, dan status perjalanan</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 sm:gap-3">
            <MerchantLanguageSwitcher
              locale={locale}
              label={languageLabel}
              options={languageOptions}
            />
            <Link
              href="/customer/dashboard"
              className="rounded-full border border-[#ecd9c2] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
            >
              Dashboard Customer
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-full border border-[#ecd9c2] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
            >
              <span>{chatLabel}</span>
              {customerChatBadgeCount > 0 ? (
                <span className="rounded-full bg-orange-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {customerChatBadgeCount}
                </span>
              ) : null}
            </Link>
            <Link
              href="https://redfeng.co/"
              className="rounded-full border border-[#ecd9c2] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
            >
              Kembali ke Situs
            </Link>
            <SignOutButton
              redirectTo="https://app.redfeng.co/login"
              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
            />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </div>
  )
}
