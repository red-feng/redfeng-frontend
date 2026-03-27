import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { formatCustomerCode } from "@/lib/merchant-code"
import { createClient } from "@/lib/supabase/server"
import SignOutButton from "@/app/components/SignOutButton"

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
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

  if (!profile) {
    await supabase.from("profiles").upsert({
      id: user.id,
      role: "customer",
    })
  } else if (profile.role === "merchant") {
    redirect("/merchant/login")
  } else if (profile.role === "admin" || profile.role === "superadmin") {
    redirect("/admin/login")
  } else if (profile.role === "finance") {
    redirect("/finance/login")
  } else if (profile.role !== "customer") {
    redirect("/login")
  }

  const customerCode = formatCustomerCode(user.id)

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)]">
      <header className="sticky top-0 z-40 border-b border-orange-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-10">
          <div className="flex items-center gap-4">
            <Link href="/customer/dashboard" className="inline-flex items-center">
              <Image
                src="/logo-redfeng.png"
                alt="RedFeng"
                width={220}
                height={64}
                priority
                className="h-14 w-auto md:h-16"
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
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Link
              href="/customer/dashboard"
              className="rounded-full border border-[#ecd9c2] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
            >
              Dashboard Customer
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
