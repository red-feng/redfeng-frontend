import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

export default async function AdminDashboard() {
  const adminSupabase = createAdminClient()

  const [merchantResult, packageResult, bookingResult] = await Promise.all([
    adminSupabase
      .from("merchants")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    adminSupabase
      .from("packages")
      .select("id, status")
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("bookings")
      .select("id, booking_status")
      .order("created_at", { ascending: false }),
  ])

  const pendingMerchants = merchantResult.count || 0
  const packages = packageResult.data || []
  const bookings = bookingResult.data || []

  const pendingPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length
  const approvedPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "approved").length
  const financeReadyCount = bookings.filter((item) => normalizeStatus(item.booking_status) === "awaiting_admin_handoff").length
  const adminMenus = [
    {
      label: "Merchant Approvals",
      href: "/admin/merchants",
      description: "Review merchant yang sudah submit onboarding dan dokumen.",
      tone: "from-amber-500 to-orange-500",
      badgeCount: pendingMerchants,
    },
    {
      label: "Review Queue",
      href: "/admin/packages",
      description: "Queue cepat untuk paket yang benar-benar menunggu review admin.",
      tone: "from-sky-500 to-cyan-500",
      badgeCount: pendingPackages,
    },
    {
      label: "Booking Handoff",
      href: "/admin/bookings",
      description: "Validasi flow pickup lalu kirim booking lunas ke finance.",
      tone: "from-emerald-500 to-lime-500",
      badgeCount: financeReadyCount,
    },
  ]

  const metricCards = [
    {
      label: "Merchant pending",
      value: String(pendingMerchants),
      note: "Partner menunggu approval admin.",
    },
    {
      label: "Review queue",
      value: String(pendingPackages),
      note: "Paket yang masih menunggu keputusan admin.",
    },
    {
      label: "Package approved",
      value: String(approvedPackages),
      note: "Paket yang sudah lolos review dan siap tayang.",
    },
    {
      label: "Finance handoff",
      value: String(financeReadyCount),
      note: "Booking yang sudah siap dikirim admin ke finance.",
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_340px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Admin Control Center
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Approval merchant, package, dan handoff booking dalam satu workspace admin.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Dashboard ini merangkum antrean approval utama Red Feng dan handoff booking yang sudah selesai pickup ke finance.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/20 bg-white/10 px-5 py-5 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Live queue snapshot</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Merchant pending</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{pendingMerchants}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Ready for finance</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{financeReadyCount}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Package approved</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{approvedPackages}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{card.value}</p>
              <p className="mt-2 text-xs leading-6 text-slate-500">{card.note}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Admin workstreams</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Approval queue utama</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Masuk ke area review merchant/package atau validasi booking yang siap di-handoff ke finance.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {adminMenus.map((menu) => (
                <Link
                  key={menu.label}
                  href={menu.href}
                  className="group overflow-hidden rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_38px_rgba(194,65,12,0.1)]"
                >
                  <div className={`inline-flex rounded-full bg-gradient-to-r ${menu.tone} px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white`}>
                    Open queue
                  </div>
                  {menu.badgeCount > 0 && (
                    <div className="mt-4 inline-flex min-w-8 items-center justify-center rounded-full bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white">
                      {menu.badgeCount > 99 ? "99+" : menu.badgeCount}
                    </div>
                  )}
                  <h3 className="mt-4 text-xl font-semibold text-slate-950">{menu.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{menu.description}</p>
                  <div className="mt-5 text-sm font-semibold text-orange-600 transition group-hover:text-orange-700">
                    Buka area kerja -&gt;
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Team split</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Admin dan finance terpisah</h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
                <p>Dashboard admin fokus ke approval merchant, package, dan validasi flow pickup booking.</p>
                <p>Dashboard finance berdiri sendiri di `/finance/dashboard` untuk setting payout dan transfer merchant.</p>
                <p>Admin tidak mengeksekusi transfer dana, hanya mengirim booking ke finance.</p>
              </div>
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Ops note</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Pembagian area kerja</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>1. Admin fokus pada approval merchant, package, dan validasi urutan Arrived, Picked up, Go.</p>
                <p>2. Setelah flow pickup lengkap, admin kirim booking ke finance.</p>
                <p>3. Finance menentukan komisi, biaya transfer, dan menjalankan payout merchant.</p>
                <p>4. Dashboard admin tidak mengeksekusi transfer dana.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
