import Link from "next/link"
import { redirect } from "next/navigation"
import AdminProductWorkspace from "@/app/components/AdminProductWorkspace"
import {
  getFlightIssueStatusLabel,
  getFlightLifecycleStatusLabel,
  getVisibleSupplierLabel,
  normalizeFlightIssueStatus,
  normalizeFlightLifecycleStatus,
} from "@/lib/affiliate-suppliers"
import { getAccessibleInternalProducts, hasInternalProductAccess } from "@/lib/internal-product-access"
import { formatBookingCode } from "@/lib/merchant-code"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { normalizeStatus } from "@/lib/status-tones"
import {
  recheckAndHoldDharmawisataFlight,
  requestFlightTicketIssue,
  resendFlightTicketEmail,
} from "../../bookings/[id]/actions"

type BookingRow = {
  id: string
  booking_code: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  booking_product_type: string | null
  fulfillment_mode: string | null
  supplier_id: string | null
  supplier_order_status: string | null
  supplier_booking_reference: string | null
  payment_status: string | null
  booking_status: string | null
  total_amount: number | null
  created_at: string | null
}

type FlightDetailRow = {
  booking_id: string
  supplier_order_id: string | null
  lifecycle_status: string | null
  issue_status: string | null
  airline_name: string | null
  flight_number: string | null
  origin_airport_code: string | null
  destination_airport_code: string | null
  departure_at: string | null
  arrival_at: string | null
  cabin_class: string | null
  passenger_count: number | null
  pnr_code: string | null
  ticket_number: string | null
  booking_hold_expires_at: string | null
  fare_reference_id: string | null
  notes: string | null
}

type SupplierRow = {
  id: string
  supplier_name: string | null
  internal_display_name: string | null
  internal_alias: string | null
}

type FlightOpsCard = {
  booking: BookingRow
  detail: FlightDetailRow
  supplierLabel: string
}

type OpsColumnKey = "recheck" | "hold" | "payment" | "ticketing" | "issued" | "follow_up"

const opsColumns: Array<{ key: OpsColumnKey; title: string; note: string; tone: string }> = [
  {
    key: "recheck",
    title: "Recheck",
    note: "Fare perlu divalidasi sebelum hold supplier.",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    key: "hold",
    title: "Hold/PNR",
    note: "Booking sudah/harus masuk hold, lalu payment dibuka.",
    tone: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  {
    key: "payment",
    title: "Payment",
    note: "Menunggu atau sudah menerima verifikasi pembayaran.",
    tone: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    key: "ticketing",
    title: "Ticketing",
    note: "Payment verified dan tiket siap/request issue.",
    tone: "border-orange-200 bg-orange-50 text-orange-700",
  },
  {
    key: "issued",
    title: "Issued",
    note: "Tiket sudah issued dan e-ticket bisa dikirim ulang.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    key: "follow_up",
    title: "Follow Up",
    note: "Issue gagal, cancel, refund, atau perlu perhatian ops.",
    tone: "border-rose-200 bg-rose-50 text-rose-700",
  },
]

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatMoney(value: number | null) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`
}

function hoursSince(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 3600000))
}

function isNewRecheckRequest(card: FlightOpsCard) {
  return getOpsColumnKey(card) === "recheck" && hoursSince(card.booking.created_at) <= 24
}

function formatCabin(value: string | null) {
  const normalized = String(value || "").replace(/_/g, " ").trim()
  if (!normalized) return "-"
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function getOpsColumnKey(card: FlightOpsCard): OpsColumnKey {
  const lifecycle = normalizeFlightLifecycleStatus(card.detail.lifecycle_status)
  const issue = normalizeFlightIssueStatus(card.detail.issue_status)

  if (
    lifecycle === "issue_failed" ||
    lifecycle === "cancelled" ||
    lifecycle === "refund_required" ||
    issue === "issue_failed" ||
    issue === "cancelled" ||
    issue === "cancel_requested" ||
    issue === "refunded"
  ) {
    return "follow_up"
  }

  if (lifecycle === "issued" || issue === "issued") return "issued"
  if (lifecycle === "ticketing" || issue === "ticketing") return "ticketing"
  if (lifecycle === "payment_uploaded" || lifecycle === "payment_verified") return "payment"
  if (lifecycle === "booking_hold_created" || lifecycle === "pending_payment") return "hold"
  return "recheck"
}

function lifecycleLabel(detail: FlightDetailRow) {
  const lifecycle = normalizeFlightLifecycleStatus(detail.lifecycle_status)
  if (lifecycle) return getFlightLifecycleStatusLabel(lifecycle)
  const issue = normalizeFlightIssueStatus(detail.issue_status)
  if (issue) return getFlightIssueStatusLabel(issue)
  return "Perlu recheck fare"
}

function canQuickRecheckAndHold(card: FlightOpsCard) {
  const lifecycle = normalizeFlightLifecycleStatus(card.detail.lifecycle_status)
  return (
    card.booking.fulfillment_mode === "affiliate_api" &&
    Boolean(card.detail.supplier_order_id) &&
    normalizeStatus(card.booking.payment_status) !== "paid" &&
    lifecycle !== "booking_hold_created" &&
    lifecycle !== "pending_payment" &&
    lifecycle !== "payment_uploaded" &&
    lifecycle !== "payment_verified" &&
    lifecycle !== "ticketing" &&
    lifecycle !== "issued"
  )
}

function canQuickIssue(card: FlightOpsCard) {
  const lifecycle = normalizeFlightLifecycleStatus(card.detail.lifecycle_status)
  const issue = normalizeFlightIssueStatus(card.detail.issue_status)
  return (
    normalizeStatus(card.booking.payment_status) === "paid" &&
    lifecycle !== "ticketing" &&
    lifecycle !== "issued" &&
    issue !== "issued"
  )
}

function canQuickResend(card: FlightOpsCard) {
  const lifecycle = normalizeFlightLifecycleStatus(card.detail.lifecycle_status)
  const issue = normalizeFlightIssueStatus(card.detail.issue_status)
  return (
    (lifecycle === "issued" || issue === "issued") &&
    Boolean(card.detail.ticket_number || card.detail.pnr_code || card.booking.supplier_booking_reference)
  )
}

function actionHint(card: FlightOpsCard) {
  if (canQuickRecheckAndHold(card)) return "Recheck dan hold booking ke Dharmawisata."
  if (canQuickIssue(card)) return "Payment verified. Lanjut request issue tiket."
  if (canQuickResend(card)) return "Tiket issued. E-ticket bisa dikirim ulang."
  const lifecycle = normalizeFlightLifecycleStatus(card.detail.lifecycle_status)
  if (lifecycle === "booking_hold_created" || lifecycle === "pending_payment") return "Tunggu customer menyelesaikan pembayaran Midtrans."
  if (lifecycle === "ticketing") return "Pantau hasil issue tiket atau follow up manual bila gagal."
  return "Buka detail untuk validasi data dan follow up."
}

export default async function AdminFlightOpsBoardPage() {
  const adminSupabase = createAdminClient()
  const supabase = await createClient("admin")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login?error=no-session")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const accessibleProducts = await getAccessibleInternalProducts(adminSupabase, user.id, profile?.role)

  if (!hasInternalProductAccess(accessibleProducts, "flight", "view")) {
    redirect("/admin/dashboard?error=Akses%20produk%20tidak%20diizinkan")
  }

  const canExecuteOps = hasInternalProductAccess(accessibleProducts, "flight", "execute")

  const { data: bookingsData } = await adminSupabase
    .from("bookings")
    .select(
      "id, booking_code, customer_name, customer_email, customer_phone, booking_product_type, fulfillment_mode, supplier_id, supplier_order_status, supplier_booking_reference, payment_status, booking_status, total_amount, created_at",
    )
    .eq("booking_product_type", "flight")
    .order("created_at", { ascending: false })
    .limit(80)

  const bookings = ((bookingsData as BookingRow[] | null) || []) as BookingRow[]
  const bookingIds = bookings.map((booking) => booking.id)

  const { data: flightDetailsData } =
    bookingIds.length > 0
      ? await adminSupabase
          .from("flight_booking_details")
          .select(
            "booking_id, supplier_order_id, lifecycle_status, issue_status, airline_name, flight_number, origin_airport_code, destination_airport_code, departure_at, arrival_at, cabin_class, passenger_count, pnr_code, ticket_number, booking_hold_expires_at, fare_reference_id, notes",
          )
          .in("booking_id", bookingIds)
      : { data: [] as FlightDetailRow[] }

  const flightDetailMap = new Map(
    (((flightDetailsData as FlightDetailRow[] | null) || []) as FlightDetailRow[]).map((detail) => [
      detail.booking_id,
      detail,
    ]),
  )

  const supplierIds = [...new Set(bookings.map((booking) => booking.supplier_id).filter(Boolean))] as string[]
  const { data: suppliersData } =
    supplierIds.length > 0
      ? await adminSupabase
          .from("suppliers")
          .select("id, supplier_name, internal_display_name, internal_alias")
          .in("id", supplierIds)
          .returns<SupplierRow[]>()
      : { data: [] as SupplierRow[] }

  const supplierMap = new Map(
    (((suppliersData as SupplierRow[] | null) || []) as SupplierRow[]).map((supplier) => [
      supplier.id,
      getVisibleSupplierLabel(supplier),
    ]),
  )

  const cards: FlightOpsCard[] = bookings
    .map((booking) => {
      const detail = flightDetailMap.get(booking.id)
      if (!detail) return null
      return {
        booking,
        detail,
        supplierLabel: supplierMap.get(booking.supplier_id || "") || "Reservation Partner",
      }
    })
    .filter(Boolean) as FlightOpsCard[]

  const cardsByColumn = new Map<OpsColumnKey, FlightOpsCard[]>(
    opsColumns.map((column) => [column.key, []]),
  )

  for (const card of cards) {
    cardsByColumn.get(getOpsColumnKey(card))?.push(card)
  }

  const paidCount = cards.filter((card) => normalizeStatus(card.booking.payment_status) === "paid").length
  const issuedCount = cardsByColumn.get("issued")?.length || 0
  const followUpCount = cardsByColumn.get("follow_up")?.length || 0
  const actionReadyCount = cards.filter((card) => canQuickRecheckAndHold(card) || canQuickIssue(card) || canQuickResend(card)).length
  const newRecheckRequests = cards.filter(isNewRecheckRequest)
  const latestNewRecheckRequests = newRecheckRequests.slice(0, 3)

  return (
    <AdminProductWorkspace
      productType="flight"
      productLabel="Pesawat Ops Board"
      description="Kanban operasional untuk memantau alur pesawat dari recheck fare, hold/PNR, payment Midtrans, ticketing, issued, sampai follow up."
      statusLabel="Flight operations live"
      statusNote="Board ini membaca booking pesawat terbaru dan menampilkan aksi cepat sesuai gate operasional yang aman."
      primaryActionHref="/admin/bookings?product=pesawat"
      primaryActionLabel="Buka Booking Center"
      secondaryActionHref="/admin/pesawat/diagnostics"
      secondaryActionLabel="Diagnostics Dharmawisata"
      preparedModules={["Recheck fare", "Hold/PNR", "Midtrans payment", "Ticket issue", "E-ticket resend", "Follow up"]}
    >
      {newRecheckRequests.length > 0 ? (
        <section className="rounded-[22px] border border-orange-200 bg-orange-50 p-5 shadow-[0_18px_44px_rgba(249,115,22,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-600">New flight requests</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                {newRecheckRequests.length} booking pesawat baru perlu recheck fare.
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-orange-800">
                Booking ini masuk dalam 24 jam terakhir dan masih menunggu validasi fare serta hold/PNR supplier sebelum payment Midtrans dibuka.
              </p>
            </div>
            <Link
              href="/admin/bookings?product=pesawat&flight=recheck"
              className="inline-flex items-center justify-center rounded-[14px] bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              Buka antrean recheck
            </Link>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {latestNewRecheckRequests.map((card) => {
              const route = `${card.detail.origin_airport_code || "-"} -> ${card.detail.destination_airport_code || "-"}`

              return (
                <Link
                  key={`new-${card.booking.id}`}
                  href={`/admin/bookings/${card.booking.id}`}
                  className="rounded-[18px] border border-orange-100 bg-white p-4 transition hover:-translate-y-0.5 hover:border-orange-300"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {formatBookingCode(card.booking.booking_code, card.booking.id)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{route}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {card.booking.customer_name || "-"} - masuk {hoursSince(card.booking.created_at)} jam lalu
                  </p>
                  <p className="mt-2 text-xs font-semibold text-orange-700">{lifecycleLabel(card.detail)}</p>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Total flight</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{cards.length}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Booking pesawat terbaru yang punya detail flight.</p>
        </div>
        <div className="rounded-[18px] border border-sky-200 bg-sky-50 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-600">Paid</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{paidCount}</p>
          <p className="mt-2 text-xs leading-5 text-sky-700">Sudah paid/verified dan siap masuk gate issue jika hold valid.</p>
        </div>
        <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-600">Issued</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{issuedCount}</p>
          <p className="mt-2 text-xs leading-5 text-emerald-700">Tiket sudah issued dan bisa resend e-ticket bila perlu.</p>
        </div>
        <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-600">Action / Follow Up</p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{actionReadyCount + followUpCount}</p>
          <p className="mt-2 text-xs leading-5 text-rose-700">Kartu yang punya aksi cepat atau butuh perhatian ops.</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-3">
        <div className="grid min-w-[1280px] gap-4 xl:grid-cols-6">
          {opsColumns.map((column) => {
            const columnCards = cardsByColumn.get(column.key) || []

            return (
              <section
                key={column.key}
                className="min-h-[520px] rounded-[22px] border border-[#eee3d9] bg-[#fffdfa] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${column.tone}`}>
                      {column.title}
                    </span>
                    <p className="mt-3 text-xs leading-5 text-slate-500">{column.note}</p>
                  </div>
                  <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
                    {columnCards.length}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {columnCards.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-[#eadfd5] bg-white p-4 text-sm text-slate-400">
                      Belum ada booking di tahap ini.
                    </div>
                  ) : (
                    columnCards.map((card) => {
                      const route = `${card.detail.origin_airport_code || "-"} -> ${card.detail.destination_airport_code || "-"}`
                      const pnrOrTicket = card.detail.ticket_number || card.detail.pnr_code || card.booking.supplier_booking_reference || ""
                      const showHold = canExecuteOps && canQuickRecheckAndHold(card)
                      const showIssue = canExecuteOps && canQuickIssue(card)
                      const showResend = canExecuteOps && canQuickResend(card)
                      const isNewRequest = isNewRecheckRequest(card)

                      return (
                        <article
                          key={card.booking.id}
                          className={`rounded-[18px] border bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ${
                            isNewRequest ? "border-orange-300 ring-2 ring-orange-100" : "border-[#eee3d9]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                {formatBookingCode(card.booking.booking_code, card.booking.id)}
                              </p>
                              <h3 className="mt-2 text-sm font-semibold leading-5 text-slate-950">
                                {route}
                              </h3>
                            </div>
                            <span className="rounded-[10px] border border-[#ecd9c2] bg-[#fff7ef] px-2 py-1 text-[10px] font-semibold text-orange-700">
                              {card.detail.passenger_count || 1} pax
                            </span>
                          </div>
                          {isNewRequest ? (
                            <span className="mt-3 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                              Baru - perlu recheck
                            </span>
                          ) : null}

                          <div className="mt-3 rounded-[14px] border border-[#f0e6dd] bg-[#fffaf3] p-3">
                            <p className="text-xs font-semibold text-slate-900">
                              {card.detail.airline_name || "Airline"} {card.detail.flight_number || ""}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {formatDateTime(card.detail.departure_at)} - {formatDateTime(card.detail.arrival_at)}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {formatCabin(card.detail.cabin_class)} - {card.supplierLabel}
                            </p>
                          </div>

                          <div className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
                            <p>Customer: {card.booking.customer_name || "-"}</p>
                            <p>Payment: {card.booking.payment_status || "-"}</p>
                            <p>Total: {formatMoney(card.booking.total_amount)}</p>
                            <p>Status: {lifecycleLabel(card.detail)}</p>
                            {pnrOrTicket ? <p>Ref: {pnrOrTicket}</p> : null}
                            {card.detail.booking_hold_expires_at ? (
                              <p>Hold until: {formatDateTime(card.detail.booking_hold_expires_at)}</p>
                            ) : null}
                          </div>

                          <p className="mt-3 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                            {actionHint(card)}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              href={`/admin/bookings/${card.booking.id}`}
                              className="inline-flex items-center justify-center rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                            >
                              Detail
                            </Link>
                            {showHold ? (
                              <form action={recheckAndHoldDharmawisataFlight}>
                                <input type="hidden" name="portal" value="admin" />
                                <input type="hidden" name="booking_id" value={card.booking.id} />
                                <button className="rounded-[12px] bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-700">
                                  Hold
                                </button>
                              </form>
                            ) : null}
                            {showIssue ? (
                              <form action={requestFlightTicketIssue}>
                                <input type="hidden" name="portal" value="admin" />
                                <input type="hidden" name="booking_id" value={card.booking.id} />
                                <button className="rounded-[12px] bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700">
                                  Issue
                                </button>
                              </form>
                            ) : null}
                            {showResend ? (
                              <form action={resendFlightTicketEmail}>
                                <input type="hidden" name="portal" value="admin" />
                                <input type="hidden" name="booking_id" value={card.booking.id} />
                                <button className="rounded-[12px] bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700">
                                  Resend
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </AdminProductWorkspace>
  )
}
