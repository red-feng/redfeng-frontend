import type { ReactNode } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createFlightBooking } from "@/app/admin/(protected)/pesawat/actions"
import { getFlightLifecycleStatusLabel, getVisibleSupplierLabel, getVisibleSupplierReference, type FlightLifecycleStatus } from "@/lib/affiliate-suppliers"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getAccessibleInternalProducts, hasInternalProductAccess } from "@/lib/internal-product-access"

type SearchParams = Promise<{ success?: string; error?: string }>

type SupplierChannelRow = {
  supplier_id: string
  channel_status: "active" | "pilot"
}

type SupplierRow = {
  id: string
  supplier_name: string
  internal_display_name: string | null
  internal_alias: string | null
  supplier_type: string
  integration_mode: "manual" | "api" | "portal" | "email"
  contact_name: string | null
  contact_email: string | null
}

const INITIAL_FLIGHT_LIFECYCLE_STEPS: FlightLifecycleStatus[] = [
  "fare_recheck_required",
  "fare_rechecked",
  "booking_hold_created",
  "pending_payment",
]

function formatSupplierMeta(supplier: SupplierRow, channelStatus: "active" | "pilot" | null) {
  const meta = [
    supplier.integration_mode === "api"
      ? "API"
      : supplier.integration_mode === "portal"
        ? "Portal"
        : supplier.integration_mode === "email"
          ? "Email"
          : "Manual",
    supplier.supplier_type === "affiliate"
      ? "Affiliate"
      : supplier.supplier_type === "aggregator"
        ? "Aggregator"
        : supplier.supplier_type === "manual_partner"
          ? "Manual Partner"
          : "Internal",
  ]

  if (channelStatus === "pilot") {
    meta.push("Pilot")
  }

  return meta.join(" | ")
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-sm font-medium text-slate-700">{children}</label>
}

function TextInput({
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
  min,
  step,
}: {
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  defaultValue?: string | number
  min?: number
  step?: number | string
}) {
  return (
    <input
      name={name}
      type={type}
      required={required}
      placeholder={placeholder}
      defaultValue={defaultValue}
      min={min}
      step={step}
      className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
    />
  )
}

export default async function AdminCreateFlightBookingPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = await createClient("admin")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login?error=no-session")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const accessibleProducts = await getAccessibleInternalProducts(adminSupabase, user.id, profile?.role)

  if (!hasInternalProductAccess(accessibleProducts, "flight", "execute")) {
    redirect("/admin/dashboard?error=Akses%20produk%20Pesawat%20tidak%20diizinkan")
  }

  const { data: channelData } = await adminSupabase
    .from("supplier_product_channels")
    .select("supplier_id, channel_status")
    .eq("product_type", "flight")
    .in("channel_status", ["active", "pilot"])
    .returns<SupplierChannelRow[]>()

  const channels = channelData || []
  const supplierIds = [...new Set(channels.map((channel) => channel.supplier_id))]

  const { data: supplierData } = supplierIds.length
    ? await adminSupabase
        .from("suppliers")
        .select("id, supplier_name, internal_display_name, internal_alias, supplier_type, integration_mode, contact_name, contact_email")
        .in("id", supplierIds)
        .eq("status", "active")
        .returns<SupplierRow[]>()
    : { data: [] as SupplierRow[] }

  const suppliers = ((supplierData || []).map((supplier) => ({
    ...supplier,
    visibleLabel: getVisibleSupplierLabel(supplier),
    visibleReference: getVisibleSupplierReference(supplier),
    channelStatus: channels.find((channel) => channel.supplier_id === supplier.id)?.channel_status || null,
  })) as Array<SupplierRow & { visibleLabel: string; visibleReference: string; channelStatus: "active" | "pilot" | null }>).sort((a, b) =>
    a.visibleLabel.localeCompare(b.visibleLabel, "id-ID"),
  )

  return (
    <main className="min-h-screen bg-[#fbfaf8] px-4 py-6 sm:px-6 lg:px-9">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <section className="rounded-[28px] border border-[#efd8c3] bg-[linear-gradient(135deg,#fff6ec_0%,#ffffff_45%,#f5f9ff_100%)] px-6 py-6 shadow-[0_20px_55px_rgba(15,23,42,0.05)] sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex rounded-full border border-[#f0d8c3] bg-white/90 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-600">
                Flight Affiliate Booking
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Buat booking Pesawat
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Form ini menulis transaksi ke <code>bookings</code>, lalu menghubungkannya ke <code>supplier_orders</code> dan <code>flight_booking_details</code>. Flow pesawat dipisah dari bus: fare direcheck, booking/hold dicatat, customer bayar, baru ticketing/issue dilakukan setelah pembayaran valid.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] border border-[#ecd9c2] bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Supplier aktif</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{suppliers.length}</p>
              </div>
              <div className="rounded-[18px] border border-[#ecd9c2] bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Produk</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">Pesawat</p>
              </div>
              <div className="rounded-[18px] border border-[#ecd9c2] bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Fulfillment</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">Affiliate</p>
              </div>
            </div>
          </div>
        </section>

        {params.success ? (
          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {params.success}
          </div>
        ) : null}

        {params.error ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {params.error}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <form
            action={createFlightBooking}
            className="rounded-[24px] border border-[#eee3d9] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.05)]"
          >
            <div className="flex flex-col gap-2 border-b border-[#f0e5db] pb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Booking form</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">Data transaksi dan penerbangan</h2>
              <p className="text-sm leading-6 text-slate-500">
                Mulai dari data minimum dulu. Status issue tiket selalu dimulai dari menunggu konfirmasi; ticketing dan issued baru dilakukan setelah pembayaran customer valid.
              </p>
            </div>

            <div className="mt-6 grid gap-6">
              <section className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>Nama customer</FieldLabel>
                  <TextInput name="customer_name" required placeholder="Mis. Bayu Kusumo" />
                </div>
                <div>
                  <FieldLabel>Email customer</FieldLabel>
                  <TextInput name="customer_email" type="email" required placeholder="bayu@email.com" />
                </div>
                <div>
                  <FieldLabel>Nomor telepon customer</FieldLabel>
                  <TextInput name="customer_phone" required placeholder="081234567890" />
                </div>
                <div>
                  <FieldLabel>Title kontak</FieldLabel>
                  <select
                    name="contact_title"
                    defaultValue="MR"
                    className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  >
                    <option value="MR">MR</option>
                    <option value="MRS">MRS</option>
                    <option value="MS">MS</option>
                    <option value="MSTR">MSTR</option>
                    <option value="MISS">MISS</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Tanggal berangkat</FieldLabel>
                  <TextInput name="pickup_date" type="date" required />
                </div>
                <div>
                  <FieldLabel>Jumlah penumpang</FieldLabel>
                  <TextInput name="passenger_count" type="number" min={1} defaultValue={1} required />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Manifest penumpang untuk Dharmawisata</FieldLabel>
                  <textarea
                    name="passenger_manifest"
                    rows={3}
                    placeholder={"MR | Bayu Kusumo | bayu@email.com\nMS | Sari Kusumo | sari@email.com"}
                    className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Isi satu baris per penumpang. Jika jumlah baris kurang dari jumlah penumpang, auto-booking Dharmawisata akan dilewati dan booking tetap masuk manual.
                  </p>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FieldLabel>Partner reservasi</FieldLabel>
                  <select
                    name="supplier_id"
                    required
                    disabled={suppliers.length === 0}
                    className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {suppliers.length === 0 ? "Belum ada partner reservasi Pesawat aktif" : "Pilih partner reservasi Pesawat"}
                    </option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.visibleLabel} ({supplier.visibleReference}) - {formatSupplierMeta(supplier, supplier.channelStatus)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Supplier order ID</FieldLabel>
                  <TextInput name="supplier_order_id" placeholder="Order ID dari partner, jika sudah ada" />
                </div>
                <div>
                  <FieldLabel>Supplier reference</FieldLabel>
                  <TextInput name="supplier_reference" placeholder="Ref eksternal / confirmation code awal" />
                </div>
                <div>
                  <FieldLabel>Fare / journey reference</FieldLabel>
                  <TextInput name="fare_reference_id" placeholder="Journey ref / fare key dari hasil recheck" />
                </div>
                <div>
                  <FieldLabel>Airline access code</FieldLabel>
                  <TextInput name="airline_access_code" placeholder="Airline access code dari hasil schedule/recheck" />
                </div>
                <div>
                  <FieldLabel>Search key</FieldLabel>
                  <TextInput name="search_key" placeholder="Wajib untuk maskapai tertentu seperti Sriwijaya" />
                </div>
                <div>
                  <FieldLabel>Detail schedule</FieldLabel>
                  <TextInput name="detail_schedule" placeholder="Detail schedule dari response Dharmawisata" />
                </div>
                <div>
                  <FieldLabel>Waktu fare recheck</FieldLabel>
                  <TextInput name="fare_rechecked_at" type="datetime-local" />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Batas hold booking</FieldLabel>
                  <TextInput name="booking_hold_expires_at" type="datetime-local" />
                  <p className="mt-2 text-xs text-slate-500">Isi jika supplier memberikan batas waktu hold/booking sebelum payment dan issue tiket.</p>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>Nama maskapai</FieldLabel>
                  <TextInput name="airline_name" required placeholder="Mis. Garuda Indonesia" />
                </div>
                <div>
                  <FieldLabel>Kode maskapai</FieldLabel>
                  <TextInput name="airline_code" placeholder="Mis. GA" />
                </div>
                <div>
                  <FieldLabel>Nomor penerbangan</FieldLabel>
                  <TextInput name="flight_number" required placeholder="Mis. GA210" />
                </div>
                <div>
                  <FieldLabel>Kelas kabin</FieldLabel>
                  <select
                    name="cabin_class"
                    defaultValue="economy"
                    className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  >
                    <option value="economy">Economy</option>
                    <option value="premium_economy">Premium Economy</option>
                    <option value="business">Business</option>
                    <option value="first">First</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Tipe perjalanan</FieldLabel>
                  <select
                    name="trip_type"
                    defaultValue="one_way"
                    className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  >
                    <option value="one_way">Sekali jalan</option>
                    <option value="round_trip">Pulang-pergi</option>
                    <option value="multi_city">Multi-city</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Kode origin airport</FieldLabel>
                  <TextInput name="origin_airport_code" required placeholder="Mis. CGK" />
                </div>
                <div>
                  <FieldLabel>Nama origin airport</FieldLabel>
                  <TextInput name="origin_airport_name" placeholder="Mis. Soekarno-Hatta" />
                </div>
                <div>
                  <FieldLabel>Kode destination airport</FieldLabel>
                  <TextInput name="destination_airport_code" required placeholder="Mis. DPS" />
                </div>
                <div>
                  <FieldLabel>Nama destination airport</FieldLabel>
                  <TextInput name="destination_airport_name" placeholder="Mis. Ngurah Rai" />
                </div>
                <div>
                  <FieldLabel>Jadwal berangkat</FieldLabel>
                  <TextInput name="departure_at" type="datetime-local" required />
                </div>
                <div>
                  <FieldLabel>Jadwal tiba</FieldLabel>
                  <TextInput name="arrival_at" type="datetime-local" />
                </div>
                <div>
                  <FieldLabel>Jadwal pulang</FieldLabel>
                  <TextInput name="return_at" type="datetime-local" />
                  <p className="mt-2 text-xs text-slate-500">Isi jika trip pulang-pergi atau multi-city sudah punya tanggal pulang awal.</p>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>PNR code</FieldLabel>
                  <TextInput name="pnr_code" placeholder="Mis. ABC123" />
                </div>
                <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3">
                  <input type="hidden" name="issue_status" value="pending_confirmation" />
                  <p className="text-sm font-semibold text-amber-900">Issue tiket: menunggu konfirmasi</p>
                  <p className="mt-2 text-xs leading-5 text-amber-800">Admin tidak memilih issued saat membuat booking. Ticketing dilakukan setelah payment bank transfer terverifikasi.</p>
                </div>
                <div>
                  <FieldLabel>Subtotal booking</FieldLabel>
                  <TextInput name="subtotal_amount" type="number" min={1} step={1000} required placeholder="Mis. 2500000" />
                </div>
                <div>
                  <FieldLabel>Biaya supplier</FieldLabel>
                  <TextInput name="supplier_cost_amount" type="number" min={1} step={1000} required placeholder="Mis. 2350000" />
                  <p className="mt-2 text-xs text-slate-500">Field ini wajib diisi agar spread harga non-paket RedFeng bisa dihitung jujur dari harga jual dikurangi biaya supplier.</p>
                </div>
                <div className="rounded-[18px] border border-sky-200 bg-sky-50 px-4 py-3">
                  <input type="hidden" name="payment_type" value="full" />
                  <p className="text-sm font-semibold text-sky-900">Jenis pembayaran: full payment</p>
                  <p className="mt-2 text-xs leading-5 text-sky-800">
                    Pesawat tidak memakai DP karena ticket issue hanya boleh berjalan setelah pembayaran customer lunas dan terverifikasi.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Metode pembayaran customer</FieldLabel>
                  <select
                    name="payment_method"
                    defaultValue="bank_transfer"
                    className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  >
                    <option value="bank_transfer">Bank transfer</option>
                  </select>
                  <p className="mt-2 text-xs text-slate-500">Saat ini rule finance customer yang aktif masih bank transfer, jadi form mengikuti konfigurasi global yang sudah ada.</p>
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Catatan operasional</FieldLabel>
                  <textarea
                    name="notes"
                    rows={4}
                    placeholder="Contoh: booking dari partner corporate, tunggu issue tiket setelah payment verified."
                    className="w-full rounded-[18px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
              </section>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-[#f0e5db] pt-5 sm:flex-row">
              <button
                disabled={suppliers.length === 0}
                className="inline-flex items-center justify-center rounded-[18px] bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Simpan booking Pesawat
              </button>
              <Link
                href="/admin/bookings?product=pesawat"
                className="inline-flex items-center justify-center rounded-[18px] border border-[#ecd9c2] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
              >
                Buka Booking Center
              </Link>
            </div>
          </form>

          <div className="space-y-6">
            <section className="rounded-[24px] border border-[#eee3d9] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Alur data</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Yang akan tercatat</h2>
              <div className="mt-5 space-y-3">
                {[
                  "Tabel bookings untuk master transaksi Red Feng dengan status pending umum; status payment flight disimpan di lifecycle detail.",
                  "Tabel supplier_orders untuk referensi order/hold ke partner reservasi dan biaya supplier.",
                  "Tabel flight_booking_details untuk rute, cabin, fare reference, hold expiry, lifecycle, dan status issue tiket.",
                ].map((item) => (
                  <div key={item} className="rounded-[18px] border border-[#f1e6dc] bg-[#fffdfa] px-4 py-3 text-sm leading-6 text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-[#eee3d9] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Lifecycle Pesawat</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Urutan sebelum issued</h2>
              <div className="mt-5 space-y-3">
                {INITIAL_FLIGHT_LIFECYCLE_STEPS.map((status, index) => (
                  <div key={status} className="flex gap-3 rounded-[18px] border border-[#f1e6dc] bg-[#fffdfa] px-4 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700">{index + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{getFlightLifecycleStatusLabel(status)}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {status === "fare_recheck_required"
                          ? "Cari dan validasi fare sebelum customer diarahkan bayar."
                          : status === "fare_rechecked"
                            ? "Simpan fare/journey reference dari hasil supplier."
                            : status === "booking_hold_created"
                              ? "Catat order/hold/PNR jika supplier sudah memberikan referensi."
                              : "Customer bayar via bank transfer; issue tiket menunggu verifikasi admin."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-[#eee3d9] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Partner siap pakai</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Channel Pesawat aktif</h2>
              <div className="mt-5 space-y-3">
                {suppliers.length > 0 ? (
                  suppliers.map((supplier) => (
                    <div key={supplier.id} className="rounded-[18px] border border-[#f1e6dc] bg-[#fffdfa] px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{supplier.visibleLabel}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{supplier.visibleReference}</p>
                        </div>
                        <span className="rounded-full border border-[#ecd9c2] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                          {supplier.channelStatus || "active"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{formatSupplierMeta(supplier, supplier.channelStatus)}</p>
                      {supplier.contact_name || supplier.contact_email ? (
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Kontak: {[supplier.contact_name, supplier.contact_email].filter(Boolean).join(" | ")}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
                    Belum ada partner reservasi dengan channel <code>flight</code> berstatus <code>active</code> atau <code>pilot</code>. Tambahkan dulu partner reservasi agar form ini bisa dipakai.
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}
