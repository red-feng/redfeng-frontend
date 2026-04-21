import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export default async function AdminPackageTourWorkspacePage() {
  const adminSupabase = createAdminClient()
  const [merchantResult, packageResult] = await Promise.all([
    adminSupabase
      .from("merchants")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    adminSupabase
      .from("packages")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ])

  const pendingMerchants = merchantResult.count || 0
  const pendingPackages = packageResult.count || 0

  const workstreams = [
    {
      label: "Merchant Directory",
      value: pendingMerchants,
      note: "Approval merchant tour dan partner yang sudah submit onboarding.",
      href: "/admin/merchants",
    },
    {
      label: "Package Review",
      value: pendingPackages,
      note: "Paket tour yang menunggu validasi admin.",
      href: "/admin/packages",
    },
    {
      label: "Booking Center",
      value: 0,
      note: "Booking lintas produk tetap dipusatkan di Booking Center admin.",
      href: "/admin/bookings?product=paket-tour",
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:px-10">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            Paket Tour
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Workspace utama admin untuk merchant dan review Paket Tour.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-orange-50/90">
            Semua workflow admin yang sudah aktif saat ini tetap berada di Paket Tour, sementara booking dipisahkan agar
            bisa melayani transaksi lintas produk.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {workstreams.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_38px_rgba(194,65,12,0.1)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{item.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.note}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
