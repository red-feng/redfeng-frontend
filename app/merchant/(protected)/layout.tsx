import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

const merchantNav = [
  { href: "/merchant/dashboard", label: "Dashboard" },
  { href: "/merchant/paket", label: "Kelola Paket" },
  { href: "/merchant/pesanan", label: "Pesanan" },
  { href: "/merchant/statistik", label: "Statistik" },
  { href: "/merchant/chat", label: "Chat" },
  { href: "/merchant/kalender-booking", label: "Kalender" },
  { href: "/merchant/saldo-payout", label: "Saldo & Payout" },
  { href: "/merchant/review", label: "Review" },
  { href: "/merchant/profil", label: "Profil" },
]

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
    .select("role")
    .eq("id", user.id)
    .single()

  if (error || !profile) {
    redirect("/")
  }

  if (profile.role !== "merchant") {
    redirect("/")
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("verification_status, onboarding_completed, brand_name, company_name, city, province")
    .eq("user_id", user.id)
    .single()

  if (!merchant) {
    redirect("/merchant/onboarding")
  }

  if (merchant.verification_status === "pending") {
    redirect("/merchant/pending")
  }

  if (merchant.verification_status === "rejected") {
    redirect("/merchant/rejected")
  }

  if (!merchant.onboarding_completed) {
    redirect("/merchant/onboarding")
  }

  const merchantLabel = merchant.brand_name || merchant.company_name || "Merchant"
  const locationLabel = [merchant.city, merchant.province].filter(Boolean).join(", ") || "Indonesia"

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)]">
      <header className="sticky top-0 z-40 border-b border-[#ecd9c2] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1480px] px-6 py-4 md:px-8 xl:px-10">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <Link href="/merchant/dashboard" className="inline-flex items-center">
                  <Image
                    src="/logo-redfeng.png"
                    alt="Red Feng"
                    width={220}
                    height={64}
                    priority
                    className="h-12 w-auto md:h-14"
                  />
                </Link>

                <div className="hidden h-10 w-px bg-[#ead8c0] lg:block" />

                <div className="hidden lg:block">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">
                    Merchant Suite
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{merchantLabel}</p>
                  <p className="text-xs text-slate-500">{locationLabel}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Red Feng Merchant
                </div>
                <Link
                  href="/"
                  className="rounded-full border border-[#ecd9c2] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
                >
                  Lihat situs
                </Link>
              </div>
            </div>

            <nav className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2">
                {merchantNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full border border-[#ecd9c2] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1480px] px-0 md:px-2 xl:px-4">{children}</div>
    </div>
  )
}
