import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type PackageRow = {
  id: string
  title: string | null
  merchant_id: string | null
  status: string | null
  city: string | null
  country: string | null
  destination_province: string | null
  created_at: string | null
}

type BookingRow = {
  id: string
  package_id: string | null
  payment_status: string | null
  payment_type: string | null
  total_amount: number | null
  dp_amount: number | null
  created_at: string | null
}

function normalizeStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

function formatMoney(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

function getReceivedAmount(booking: BookingRow) {
  const paymentStatus = normalizeStatus(booking.payment_status)
  if (paymentStatus === "paid") return Number(booking.total_amount || 0)
  if (paymentStatus === "dp_paid") return Number(booking.dp_amount || 0)
  return 0
}

export default async function AdminPackageTourWorkspacePage() {
  const adminSupabase = createAdminClient()
  const [merchantResult, packageResult] = await Promise.all([
    adminSupabase
      .from("merchants")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    adminSupabase
      .from("packages")
      .select("id, title, merchant_id, status, city, country, destination_province, created_at")
      .order("created_at", { ascending: false }),
  ])

  const pendingMerchants = merchantResult.count || 0
  const packages = (packageResult.data as PackageRow[] | null) || []
  const packageIds = packages.map((pkg) => pkg.id)
  const bookingResult =
    packageIds.length > 0
      ? await adminSupabase
          .from("bookings")
          .select("id, package_id, payment_status, payment_type, total_amount, dp_amount, created_at")
          .in("package_id", packageIds)
          .order("created_at", { ascending: false })
      : { data: [] as BookingRow[] }
  const bookings = (bookingResult.data as BookingRow[] | null) || []
  const merchantIds = Array.from(new Set(packages.map((pkg) => pkg.merchant_id).filter((id): id is string => Boolean(id))))
  const merchantResultById =
    merchantIds.length > 0
      ? await adminSupabase.from("merchants").select("id, brand_name, company_name").in("id", merchantIds)
      : { data: [] as Array<{ id: string; brand_name: string | null; company_name: string | null }> }
  const merchantNameMap = new Map(
    ((merchantResultById.data as Array<{ id: string; brand_name: string | null; company_name: string | null }> | null) || []).map((merchant) => [
      merchant.id,
      merchant.brand_name || merchant.company_name || "Merchant tanpa nama",
    ]),
  )
  const packageMap = new Map(packages.map((pkg) => [pkg.id, pkg]))
  const pendingPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "pending").length
  const approvedPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "approved").length
  const draftPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "draft").length
  const rejectedPackages = packages.filter((pkg) => normalizeStatus(pkg.status) === "rejected").length
  const totalRevenue = bookings.reduce((sum, booking) => sum + getReceivedAmount(booking), 0)
  const activeMerchantCount = new Set(packages.map((pkg) => pkg.merchant_id).filter(Boolean)).size
  const merchantRevenueMap = bookings.reduce((map, booking) => {
    const merchantId = booking.package_id ? packageMap.get(booking.package_id)?.merchant_id : null
    if (!merchantId) return map
    map.set(merchantId, (map.get(merchantId) || 0) + getReceivedAmount(booking))
    return map
  }, new Map<string, number>())
  const topMerchantBase = Math.max(...Array.from(merchantRevenueMap.values()), 1)
  const topMerchants = Array.from(merchantRevenueMap)
    .map(([merchantId, value]) => ({
      name: merchantNameMap.get(merchantId) || "Merchant tanpa nama",
      value,
      percent: Math.max(Math.round((value / topMerchantBase) * 100), 8),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const destinationMap = bookings.reduce((map, booking) => {
    const pkg = booking.package_id ? packageMap.get(booking.package_id) : null
    const label = pkg?.city || pkg?.destination_province || pkg?.country || "Tanpa destinasi"
    map.set(label, (map.get(label) || 0) + 1)
    return map
  }, new Map<string, number>())
  const topDestinationBase = Math.max(...Array.from(destinationMap.values()), 1)
  const topDestinations = Array.from(destinationMap)
    .map(([name, value]) => ({ name, value, percent: Math.max(Math.round((value / topDestinationBase) * 100), 8) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const kpiCards = [
    { label: "Total Booking", value: bookings.length.toLocaleString("id-ID"), note: "Booking paket tour dari checkout customer.", tone: "text-sky-600", bg: "bg-sky-50" },
    { label: "Revenue Paket", value: formatMoney(totalRevenue), note: "Paid dan DP paid yang sudah diterima.", tone: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Merchant Aktif", value: activeMerchantCount.toLocaleString("id-ID"), note: "Merchant yang punya paket tour.", tone: "text-violet-600", bg: "bg-violet-50" },
    { label: "Pending Review", value: pendingPackages.toLocaleString("id-ID"), note: "Paket menunggu validasi admin.", tone: "text-orange-600", bg: "bg-orange-50" },
  ]
  const packageQueueRows = [
    { label: "Approved", value: approvedPackages, note: "Paket sudah aktif di marketplace.", tone: "text-emerald-600" },
    { label: "Pending Review", value: pendingPackages, note: "Perlu review admin.", tone: "text-orange-600" },
    { label: "Draft", value: draftPackages, note: "Belum disubmit merchant.", tone: "text-slate-600" },
    { label: "Rejected", value: rejectedPackages, note: "Paket ditolak / perlu perbaikan.", tone: "text-rose-600" },
  ]

  return (
    <main className="min-h-screen bg-[#fbfaf8] px-4 py-6 sm:px-6 lg:px-9">
      <div className="mx-auto max-w-[1680px] space-y-6">
        <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-[#f0d8c3] bg-[#fff7ef] px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-orange-600">
              Product Dashboard
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Dashboard Paket Tour</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Monitor performa paket wisata, merchant, queue review, booking, revenue, dan destinasi dari data marketplace yang sudah aktif.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/packages" className="rounded-[14px] bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">
              Review Paket
            </Link>
            <Link href="/admin/bookings?product=paket-tour" className="rounded-[14px] border border-[#eadfd5] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600">
              Booking Paket
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <div key={card.label} className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <div className="flex items-start gap-3">
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${card.bg} ${card.tone}`}>{card.label[0]}</span>
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{card.value}</p>
                  <p className="mt-3 text-xs leading-5 text-slate-400">{card.note}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="grid items-start gap-5 xl:grid-cols-[1fr_1fr_1fr]">
          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-950">Package Queue</h2>
              <Link href="/admin/packages" className="text-xs font-semibold text-orange-600">Lihat semua</Link>
            </div>
            <div className="mt-5 space-y-3">
              {packageQueueRows.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-[16px] border border-[#f0e6dd] bg-[#fffdfa] p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                  </div>
                  <span className={`text-sm font-semibold ${item.tone}`}>{item.value.toLocaleString("id-ID")}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Top Merchant Revenue</h2>
            <div className="mt-5 space-y-3">
              {(topMerchants.length > 0 ? topMerchants : [{ name: "Belum ada revenue", value: 0, percent: 0 }]).map((item, index) => (
                <div key={item.name} className="grid grid-cols-[24px_1fr_auto] items-center gap-3 text-sm">
                  <span className="font-semibold text-slate-500">{index + 1}</span>
                  <div>
                    <p className="font-medium text-slate-700">{item.name}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-[#f0e6dd]">
                      <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                  <span className="font-semibold text-slate-900">{formatMoney(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Top Destinasi</h2>
            <div className="mt-5 space-y-3">
              {(topDestinations.length > 0 ? topDestinations : [{ name: "Belum ada booking", value: 0, percent: 0 }]).map((item, index) => (
                <div key={item.name} className="grid grid-cols-[24px_1fr_auto] items-center gap-3 text-sm">
                  <span className="font-semibold text-slate-500">{index + 1}</span>
                  <div>
                    <p className="font-medium text-slate-700">{item.name}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-[#f0e6dd]">
                      <div className="h-1.5 rounded-full bg-sky-500" style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                  <span className="font-semibold text-slate-900">{item.value.toLocaleString("id-ID")}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Merchant Queue</h2>
            <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950">{pendingMerchants.toLocaleString("id-ID")}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">Merchant baru yang menunggu approval dan bisa masuk sebagai partner Paket Tour.</p>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Quick Actions</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Merchant Directory", href: "/admin/merchants", badge: pendingMerchants },
                { label: "Package Review", href: "/admin/packages", badge: pendingPackages },
                { label: "Booking Center", href: "/admin/bookings?product=paket-tour", badge: bookings.length },
                { label: "Dashboard Utama", href: "/admin/dashboard", badge: 0 },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="flex items-center justify-between rounded-[16px] border border-[#f0e6dd] bg-[#fffdfa] px-4 py-4 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                  {item.label}
                  {item.badge > 0 ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600">{item.badge > 99 ? "99+" : item.badge}</span> : null}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
