import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"
import { createAdminClient } from "@/lib/supabase/admin"
import { updateHotelAvailabilityRequestAction } from "./actions"

type HotelAvailabilityRequestRow = {
  id: string
  request_code: string
  status: string
  hotel_name: string
  hotel_location: string
  property_type: string
  checkin_date: string
  checkout_date: string
  night_count: number | string
  adult_count: number | string
  child_count: number | string
  room_count: number | string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  estimated_total_amount: number | string
  quoted_total_amount: number | string | null
  currency: string
  created_at: string
}

const hotelRequestStatuses = [
  ["availability_requested", "Availability requested"],
  ["checking_supplier", "Checking supplier"],
  ["available", "Available"],
  ["unavailable", "Unavailable"],
  ["quote_sent", "Quote sent"],
  ["converted", "Converted"],
  ["cancelled", "Cancelled"],
]

function formatMoney(value: number | string | null, currency = "IDR") {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return "-"
  return `${currency} ${amount.toLocaleString("id-ID")}`
}

function formatDate(value: string) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`))
}

export default async function AdminHotelWorkspacePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const successMessage = Array.isArray(resolvedSearchParams.success) ? resolvedSearchParams.success[0] : resolvedSearchParams.success
  const errorMessage = Array.isArray(resolvedSearchParams.error) ? resolvedSearchParams.error[0] : resolvedSearchParams.error
  const adminSupabase = createAdminClient()
  const { data: requests, error } = await adminSupabase
    .from("hotel_availability_requests")
    .select("id, request_code, status, hotel_name, hotel_location, property_type, checkin_date, checkout_date, night_count, adult_count, child_count, room_count, customer_name, customer_phone, customer_email, estimated_total_amount, quoted_total_amount, currency, created_at")
    .order("created_at", { ascending: false })
    .limit(12)

  const rows = (requests || []) as HotelAvailabilityRequestRow[]
  const pendingCount = rows.filter((row) => ["availability_requested", "checking_supplier"].includes(row.status)).length
  const quoteCount = rows.filter((row) => row.status === "quote_sent").length

  return (
    <AdminProductWorkspace
      productType="hotel"
      productLabel="Hotel"
      description="Submenu admin untuk Hotel dipisahkan agar inventory kamar, supplier, rate plan, dan operasional hotel bisa punya workflow sendiri."
      statusLabel="Manual check aktif"
      statusNote="Katalog Hotel sudah bisa menerima request availability manual. Booking/checkout live tetap menunggu inventory dan rate plan supplier."
      primaryActionHref="/hotel/catalog"
      primaryActionLabel="Buka katalog Hotel"
      secondaryActionHref="/admin/dashboard"
      secondaryActionLabel="Kembali ke dashboard admin"
      preparedModules={["Availability request", "Manual supplier check", "Quote follow up", "Future live inventory"]}
    >
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Request terbaru</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{rows.length}</p>
          <p className="mt-2 text-xs text-slate-500">Ditampilkan dari request availability hotel terakhir.</p>
        </div>
        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Perlu dicek</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-orange-600">{pendingCount}</p>
          <p className="mt-2 text-xs text-slate-500">Status availability requested atau checking supplier.</p>
        </div>
        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quote terkirim</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-emerald-600">{quoteCount}</p>
          <p className="mt-2 text-xs text-slate-500">Request yang sudah punya follow up quote.</p>
        </div>
      </section>

      {successMessage ? (
        <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{decodeURIComponent(successMessage)}</div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{decodeURIComponent(errorMessage)}</div>
      ) : null}

      <section className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Queue availability hotel</h2>
            <p className="mt-1 text-sm text-slate-500">Request dari katalog curated masuk ke sini untuk dicek manual ke supplier.</p>
          </div>
          <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            Manual operation
          </span>
        </div>

        {error ? (
          <div className="mt-5 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Tabel request hotel belum tersedia di database aktif. Jalankan migration `2026061901_create_hotel_availability_requests.sql`.
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-5 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Belum ada request availability hotel.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {rows.map((request) => (
              <article key={request.id} className="rounded-[18px] border border-[#f0e6dd] bg-[#fffdfa] p-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{request.request_code}</span>
                      <span className="rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">{request.status.replace(/_/g, " ")}</span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-slate-950">{request.hotel_name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{request.hotel_location} | {request.property_type}</p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                      <p><span className="font-semibold text-slate-900">Stay:</span> {formatDate(request.checkin_date)} - {formatDate(request.checkout_date)} ({request.night_count} malam)</p>
                      <p><span className="font-semibold text-slate-900">Tamu:</span> {request.adult_count} dewasa, {request.child_count} anak, {request.room_count} kamar</p>
                      <p><span className="font-semibold text-slate-900">Estimasi:</span> {formatMoney(request.estimated_total_amount, request.currency)}</p>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">{request.customer_name}</span> | {request.customer_phone}
                      {request.customer_email ? ` | ${request.customer_email}` : ""}
                    </p>
                  </div>

                  <form action={updateHotelAvailabilityRequestAction} className="rounded-[16px] border border-[#eadfd5] bg-white p-3">
                    <input type="hidden" name="request_id" value={request.id} />
                    <div className="grid gap-3">
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Status</span>
                        <select name="status" defaultValue={request.status} className="mt-1 w-full rounded-[12px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100">
                          {hotelRequestStatuses.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Quote total</span>
                        <input name="quoted_total_amount" type="number" min="0" step="1000" defaultValue={request.quoted_total_amount ? String(request.quoted_total_amount) : ""} placeholder="Contoh: 2500000" className="mt-1 w-full rounded-[12px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-slate-600">Catatan follow up</span>
                        <textarea name="admin_note" rows={2} className="mt-1 w-full rounded-[12px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" />
                      </label>
                      <button type="submit" className="rounded-[12px] bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700">
                        Update request
                      </button>
                    </div>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminProductWorkspace>
  )
}
