import Link from "next/link"
import { redirect } from "next/navigation"
import SignOutButton from "@/app/components/SignOutButton"
import { createClient } from "@/lib/supabase/server"

export default async function FinanceProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/finance/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/finance/login")
  }

  if (profile.role === "merchant") {
    redirect("/merchant/dashboard")
  }

  if (!["finance", "superadmin"].includes(profile.role)) {
    redirect("/finance/login")
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)]">
      <header className="sticky top-0 z-40 border-b border-[#ecd9c2] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4 sm:px-8 lg:px-10">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Finance Workspace</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">Dashboard finance internal Red Feng</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/finance/dashboard"
              className="rounded-full border border-[#ecd9c2] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
            >
              Dashboard
            </Link>
            <SignOutButton
              redirectTo="https://app.redfeng.co/finance/login"
              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
            />
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
