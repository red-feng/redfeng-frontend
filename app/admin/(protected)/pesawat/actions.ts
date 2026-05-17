"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { calculateBookingAmounts, getFinanceSettings, resolveActiveCustomerPaymentMethod } from "@/lib/finance/settings"
import { formatBookingCode } from "@/lib/merchant-code"
import { getAccessibleInternalProducts, hasInternalProductAccess } from "@/lib/internal-product-access"
import { getVisibleSupplierLabel, normalizeFlightIssueStatus, normalizeSupplierOrderStatus } from "@/lib/affiliate-suppliers"

function generateBookingCode() {
  const random = Math.floor(1000 + Math.random() * 9000)
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `RF${year}${month}${day}${random}`
}

function normalizeCabinClass(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "premium_economy" || normalized === "business" || normalized === "first") {
    return normalized
  }
  return "economy"
}

function normalizeTripType(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "round_trip" || normalized === "multi_city") {
    return normalized
  }
  return "one_way"
}

async function ensureFlightAdmin() {
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

  return {
    user,
    role: profile?.role || "admin",
    adminSupabase,
  }
}

function backToFlightCreate(message: string, type: "success" | "error"): never {
  redirect(`/admin/pesawat/bookings/new?${type}=${encodeURIComponent(message)}`)
}

export async function createFlightBooking(formData: FormData) {
  const actor = await ensureFlightAdmin()
  const customerName = String(formData.get("customer_name") || "").trim()
  const customerEmail = String(formData.get("customer_email") || "").trim().toLowerCase()
  const pickupDate = String(formData.get("pickup_date") || "").trim()
  const airlineName = String(formData.get("airline_name") || "").trim()
  const airlineCode = String(formData.get("airline_code") || "").trim().toUpperCase()
  const flightNumber = String(formData.get("flight_number") || "").trim().toUpperCase()
  const originAirportCode = String(formData.get("origin_airport_code") || "").trim().toUpperCase()
  const originAirportName = String(formData.get("origin_airport_name") || "").trim()
  const destinationAirportCode = String(formData.get("destination_airport_code") || "").trim().toUpperCase()
  const destinationAirportName = String(formData.get("destination_airport_name") || "").trim()
  const departureAt = String(formData.get("departure_at") || "").trim()
  const arrivalAt = String(formData.get("arrival_at") || "").trim()
  const returnAt = String(formData.get("return_at") || "").trim()
  const tripType = normalizeTripType(String(formData.get("trip_type") || (returnAt ? "round_trip" : "one_way")))
  const supplierId = String(formData.get("supplier_id") || "").trim()
  const supplierOrderId = String(formData.get("supplier_order_id") || "").trim()
  const supplierReference = String(formData.get("supplier_reference") || "").trim()
  const pnrCode = String(formData.get("pnr_code") || "").trim().toUpperCase()
  const cabinClass = normalizeCabinClass(String(formData.get("cabin_class") || "economy"))
  const issueStatus = normalizeFlightIssueStatus(String(formData.get("issue_status") || "pending_confirmation")) || "pending_confirmation"
  const notes = String(formData.get("notes") || "").trim()
  const passengerCount = Math.max(Number(formData.get("passenger_count") || 1), 1)
  const subtotalAmount = Math.max(Number(formData.get("subtotal_amount") || 0), 0)
  const supplierCostAmount = Math.max(Number(formData.get("supplier_cost_amount") || 0), 0)
  const paymentType = String(formData.get("payment_type") || "full").trim().toLowerCase() === "dp" ? "dp" : "full"
  const paymentMethod = resolveActiveCustomerPaymentMethod(String(formData.get("payment_method") || "bank_transfer"))

  if (!customerName || !customerEmail || !pickupDate) {
    backToFlightCreate("Nama customer, email customer, dan tanggal keberangkatan wajib diisi.", "error")
  }

  if (!airlineName || !flightNumber || !originAirportCode || !destinationAirportCode || !departureAt) {
    backToFlightCreate("Maskapai, nomor penerbangan, origin, destination, dan jadwal berangkat wajib diisi.", "error")
  }

  if (tripType === "round_trip" && !returnAt) {
    backToFlightCreate("Tanggal pulang wajib diisi untuk trip tipe pulang-pergi.", "error")
  }

  if (!supplierId) {
    backToFlightCreate("Supplier affiliate wajib dipilih untuk booking Pesawat.", "error")
  }

  if (subtotalAmount <= 0) {
    backToFlightCreate("Subtotal booking pesawat harus lebih besar dari nol.", "error")
  }

  if (supplierCostAmount <= 0) {
    backToFlightCreate("Biaya supplier pesawat harus diisi agar spread harga RedFeng tercatat jujur.", "error")
  }

  const { data: supplier } = await actor.adminSupabase
    .from("suppliers")
    .select("id, supplier_name, internal_display_name, internal_alias, integration_mode, status")
    .eq("id", supplierId)
    .eq("status", "active")
    .maybeSingle<{
      id: string
      supplier_name: string
      internal_display_name: string | null
      internal_alias: string | null
      integration_mode: "manual" | "api" | "portal" | "email"
      status: string
    }>()

  if (!supplier) {
    backToFlightCreate("Supplier Pesawat tidak ditemukan atau sedang nonaktif.", "error")
  }

  const visibleSupplierLabel = getVisibleSupplierLabel(supplier)

  const { data: supplierChannel } = await actor.adminSupabase
    .from("supplier_product_channels")
    .select("supplier_id, product_type, channel_status")
    .eq("supplier_id", supplier.id)
    .eq("product_type", "flight")
    .in("channel_status", ["active", "pilot"])
    .maybeSingle<{ supplier_id: string; product_type: string; channel_status: string }>()

  if (!supplierChannel) {
    backToFlightCreate("Supplier yang dipilih belum aktif untuk channel Pesawat.", "error")
  }

  const fulfillmentMode = supplier.integration_mode === "api" ? "affiliate_api" : "affiliate_manual"
  const supplierOrderStatus =
    normalizeSupplierOrderStatus(
      supplierOrderId || supplierReference ? "submitted" : "pending_submission",
    ) || "pending_submission"

  const settings = await getFinanceSettings(actor.adminSupabase as unknown as Parameters<typeof getFinanceSettings>[0])
  const priceBreakdown = calculateBookingAmounts(subtotalAmount, paymentMethod, settings)
  const recordedSpreadAmount = Math.round(subtotalAmount - supplierCostAmount)
  const bookingCode = generateBookingCode()
  const expiry = new Date()
  expiry.setMinutes(expiry.getMinutes() + 30)

  const { data: booking, error: bookingError } = await actor.adminSupabase
    .from("bookings")
    .insert({
        booking_product_type: "flight",
        fulfillment_mode: fulfillmentMode,
        supplier_id: supplier.id,
        supplier_booking_reference: supplierReference || null,
        supplier_order_status: supplierOrderStatus,
        booking_code: bookingCode,
        customer_name: customerName,
        customer_email: customerEmail,
      pickup_date: pickupDate,
      expiry_time: expiry.toISOString(),
      payment_type: paymentType,
      payment_status: "pending",
      booking_status: "pending",
      escrow_status: "pending_payment",
      display_currency: "IDR",
      display_subtotal_amount: priceBreakdown.subtotalAmount,
      subtotal_amount: priceBreakdown.subtotalAmount,
      customer_admin_fee_amount: priceBreakdown.customerAdminFeeAmount,
      customer_tax_amount: priceBreakdown.customerTaxAmount,
      redfeng_profit_source: "non_package_spread",
      supplier_net_cost_amount: supplierCostAmount,
      redfeng_spread_amount: recordedSpreadAmount,
      redfeng_recorded_profit_amount: recordedSpreadAmount,
      profit_recorded_at: new Date().toISOString(),
      customer_admin_fee_percent: priceBreakdown.customerAdminFeePercent,
      customer_tax_percent: priceBreakdown.customerTaxPercent,
      total_amount: priceBreakdown.totalAmount,
      final_payment_amount: priceBreakdown.finalPaymentAmount,
      dp_amount: priceBreakdown.dpAmount,
      payment_method: priceBreakdown.paymentMethod,
      adult_count: passengerCount,
      child_count: 0,
    })
    .select("id, booking_code")
    .single()

  if (bookingError || !booking) {
    backToFlightCreate(bookingError?.message || "Gagal membuat booking Pesawat.", "error")
  }

  const { data: supplierOrder, error: supplierOrderError } = await actor.adminSupabase
    .from("supplier_orders")
    .insert({
      booking_id: booking.id,
      supplier_id: supplier.id,
      product_type: "flight",
      supplier_order_id: supplierOrderId || null,
      supplier_reference: supplierReference || null,
      supplier_status: supplierOrderStatus,
      supplier_cost_amount: supplierCostAmount,
      supplier_cost_currency: "IDR",
      supplier_cost_recorded_at: new Date().toISOString(),
      submission_mode: supplier.integration_mode,
      submitted_at: supplierOrderStatus === "submitted" ? new Date().toISOString() : null,
      created_by: actor.user.id,
      updated_by: actor.user.id,
    })
    .select("id")
    .single<{ id: string }>()

  if (supplierOrderError || !supplierOrder) {
    await actor.adminSupabase.from("bookings").delete().eq("id", booking.id)
    backToFlightCreate(supplierOrderError?.message || "Gagal menyimpan order supplier Pesawat.", "error")
  }

  const { error: detailError } = await actor.adminSupabase.from("flight_booking_details").insert({
    booking_id: booking.id,
    supplier_order_id: supplierOrder.id,
    airline_code: airlineCode || null,
    airline_name: airlineName,
    flight_number: flightNumber,
    origin_airport_code: originAirportCode,
    origin_airport_name: originAirportName || null,
    destination_airport_code: destinationAirportCode,
    destination_airport_name: destinationAirportName || null,
    departure_at: departureAt,
    arrival_at: arrivalAt || null,
    return_at: returnAt || null,
    cabin_class: cabinClass,
    trip_type: tripType,
    passenger_count: passengerCount,
    pnr_code: pnrCode || null,
    issue_status: issueStatus,
    notes: notes || null,
  })

  if (detailError) {
    await actor.adminSupabase.from("supplier_orders").delete().eq("id", supplierOrder.id)
    await actor.adminSupabase.from("bookings").delete().eq("id", booking.id)
    backToFlightCreate(detailError.message || "Gagal menyimpan detail booking Pesawat.", "error")
  }

  await createAdminAuditLog({
    actorId: actor.user.id,
    actorRole: actor.role,
    targetType: "booking",
    targetId: booking.id,
    action: "create_flight_booking",
    summary: `Booking pesawat ${formatBookingCode(booking.booking_code, booking.id)} dibuat`,
    metadata: {
      productType: "flight",
      supplierId: supplier.id,
      supplierLabel: visibleSupplierLabel,
      supplierOrderId,
      supplierReference,
      supplierOrderStatus,
      customerEmail,
      airlineName,
        airlineCode,
        flightNumber,
        originAirportCode,
        destinationAirportCode,
        tripType,
        returnAt: returnAt || null,
        passengerCount,
        subtotalAmount: priceBreakdown.subtotalAmount,
        supplierCostAmount,
      recordedSpreadAmount,
      totalAmount: priceBreakdown.totalAmount,
    },
  })

  revalidatePath("/admin/bookings")
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/pesawat")
  revalidatePath(`/admin/bookings/${booking.id}`)

  redirect(`/admin/bookings/${booking.id}?success=${encodeURIComponent("Booking Pesawat berhasil dibuat.")}`)
}
