import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"

function normalizeStatus(value: string | null) {
  return (value || "").trim().toLowerCase()
}

function daysSince(value: string | null | undefined) {
  if (!value) return 0
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 0
  const diff = Date.now() - parsed.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default async function AdminDashboard() {
  const adminSupabase = createAdminClient()

  const [merchantResult, packageResult, bookingResult] = await Promise.all([
    adminSupabase
      .from("merchants")
      .select("id, created_at")
      .eq("verification_status", "pending"),
    adminSupabase
      .from("packages")
      .select("id, status, created_at")
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("bookings")
      .select("id, booking_status, created_at")
      .order("created_at", { ascending: false }),
  ])

  const pendingMerchantsData = (merchantResult.data as Array<{ id: string; created_at: string | null }> | null) || []
  const packages = (packageResult.data as Array<{ id: string; status: string | null; created_at: string | null }> | null) || []
  const bookings = (bookingResult.data as Array<{ id: string; booking_status: string | null; created_at: string | null }> | null) || []
  const pendingMerchants = pendingMerchantsData.length

  const pendingPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length
  const approvedPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "approved").length
  const financeReadyCount = bookings.filter((item) => normalizeStatus(item.booking_status) === "awaiting_admin_handoff").length
  const merchantOverdueCount = pendingMerchantsData.filter((merchant) => daysSince(merchant.created_at) >= 3).length
  const packageOverdueCount = packages.filter(
    (pkg) => normalizeStatus(pkg.status) === "pending" && daysSince(pkg.created_at) >= 3,
  ).length
  const bookingStalledCount = bookings.filter(
    (booking) => normalizeStatus(booking.booking_status) === "awaiting_admin_handoff" && daysSince(booking.created_at) >= 1,
  ).length
  const needsAttentionCards = [
    {
      label: "Merchant overdue",
      value: merchantOverdueCount,
      note: "Merchant pending 3 hari atau lebih.",
    },
    {
      label: "Package overdue",
      value: packageOverdueCount,
      note: "Package review yang belum disentuh 3 hari atau lebih.",
    },
    {
      label: "Booking stalled",
      value: bookingStalledCount,
      note: "Booking siap handoff 1 hari atau lebih.",
    },
  ]
  const slaCards = [
    {
      label: "Merchant SLA",
      value: `${pendingMerchants - merchantOverdueCount} within SLA`,
      note: "Target review merchant di bawah 3 hari.",
    },
    {
      label: "Package SLA",
      value: `${pendingPackages - packageOverdueCount} within SLA`,
      note: "Target review package di bawah 3 hari.",
    },
    {
      label: "Booking SLA",
      value: `${financeReadyCount - bookingStalledCount} within SLA`,
      note: "Target handoff booking di bawah 1 hari.",
    },
  ]
  const packageTourMenus = [
    {
      label: "Merchant Directory",
      href: "/admin/merchants",
      description: "Direktori merchant untuk approval, pengecekan dokumen, dan kontrol status merchant tour.",
      tone: "from-amber-500 to-orange-500",
      badgeCount: pendingMerchants,
    },
    {
      label: "Package Review",
      href: "/admin/packages",
      description: "Antrian review paket yang benar-benar menunggu validasi admin.",
      tone: "from-sky-500 to-cyan-500",
      badgeCount: pendingPackages,
    },
  ]
  const bookingMenus = [
    {
      label: "Booking Center",
      href: "/admin/bookings",
      description: "Pusat kontrol booking lintas produk untuk validasi operasional dan handoff ke finance.",
      tone: "from-emerald-500 to-lime-500",
      badgeCount: financeReadyCount,
    },
  ]
  const productChannels = [
    {
      id: "paket-tour",
      label: "Paket Tour",
      href: "/admin/paket-tour",
      status: "Aktif",
      description: "Seluruh menu admin yang ada sekarang untuk merchant dan review paket masuk ke channel ini.",
    },
    {
      id: "pesawat",
      label: "Pesawat",
      href: "/admin/pesawat",
      status: "Segera hadir",
      description: "Disiapkan untuk operasional dan review tiket pesawat di dashboard admin.",
    },
    {
      id: "hotel",
      label: "Hotel",
      href: "/admin/hotel",
      status: "Segera hadir",
      description: "Tempat future workflow hotel, inventory, dan approval operasional hotel.",
    },
    {
      id: "bus-travel",
      label: "Bus & Travel",
      href: "/admin/bus-travel",
      status: "Segera hadir",
      description: "Area admin untuk produk bus dan travel akan ditempatkan di modul ini.",
    },
    {
      id: "kereta-api",
      label: "Kereta Api",
      href: "/admin/kereta-api",
      status: "Segera hadir",
      description: "Modul admin kereta api disiapkan terpisah dari paket tour.",
    },
    {
      id: "kapal-laut",
      label: "Kapal Laut",
      href: "/admin/kapal-laut",
      status: "Segera hadir",
      description: "Workflow tiket kapal laut nantinya bisa dikelola dari channel ini.",
    },
    {
      id: "kapal-pesiar",
      label: "Kapal Pesiar",
      href: "/admin/kapal-pesiar",
      status: "Segera hadir",
      description: "Channel khusus cruise atau kapal pesiar untuk admin Red Feng.",
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
                Dashboard admin multi-produk dengan Paket Tour sebagai workspace utama saat ini.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Semua workflow merchant dan review yang aktif saat ini dipusatkan di Paket Tour, sementara booking tetap dipisah karena akan menampung transaksi lintas produk.
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

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Needs Attention</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Antrian yang perlu perhatian cepat</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {needsAttentionCards.map((card) => (
                <div key={card.label} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">SLA Monitor</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Target respons operasional admin</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {slaCards.map((card) => (
                <div key={card.label} className="rounded-[24px] border border-[#efe1cf] bg-white p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                  <p className="mt-3 text-xl font-semibold text-slate-950">{card.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Product menu</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Kanal produk admin</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Paket Tour menjadi rumah untuk menu merchant dan review saat ini. Booking tetap terpisah agar bisa menampung booking dari pesawat, hotel, bus, kereta, kapal laut, dan kapal pesiar.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {productChannels.map((channel) => (
              <Link
                key={channel.id}
                href={channel.href}
                className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_38px_rgba(194,65,12,0.1)]"
              >
                <div className="inline-flex rounded-full border border-orange-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-600">
                  {channel.status}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-950">{channel.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{channel.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div
            id="paket-tour"
            className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Paket Tour</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Workspace Paket Tour</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Semua menu admin yang aktif sekarang selain booking dikumpulkan di sini agar struktur multi-produk tetap rapi.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {packageTourMenus.map((menu) => (
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

          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Booking lintas produk</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Booking Center</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Booking Center menjadi pusat monitoring semua transaksi lintas produk, lalu admin bisa masuk ke channel yang relevan atau langsung melanjutkan handoff ke finance.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {bookingMenus.map((menu) => (
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-[#efe1cf] bg-white p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Peran utama</p>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                    <p>Booking Center menggabungkan semua booking customer dari tiap channel produk.</p>
                    <p>Admin memantau status operasional, filter per produk, lalu mengirim booking yang siap ke finance.</p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#efe1cf] bg-white p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Alur kerja</p>
                  <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                    <p>1. Booking masuk ke Booking Center.</p>
                    <p>2. Admin filter berdasarkan produk bila dibutuhkan.</p>
                    <p>3. Setelah valid, booking di-handoff ke finance.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
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
        </section>
      </div>
    </main>
  )
}
