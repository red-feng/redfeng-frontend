import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  buildHotelEstimatedStayTotal,
  getHotelCatalogItem,
  getHotelFactValue,
  getHotelStayNights,
  parsePositiveInteger,
} from "@/lib/hotels/hotelAvailability"

function generateHotelRequestCode() {
  const date = new Date()
  const year = String(date.getFullYear()).slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const random = Math.floor(1000 + Math.random() * 9000)
  return `HTL${year}${month}${day}${random}`
}

function normalizeText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim()
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>
    const hotelId = normalizeText(body.hotel_id)
    const source = normalizeText(body.source)
    const hotelNameFromBody = normalizeText(body.hotel_name)
    const hotelLocationFromBody = normalizeText(body.hotel_location)
    const supplierHotelId = normalizeText(body.supplier_hotel_id)
    const supplierInternalCode = normalizeText(body.supplier_internal_code)
    const supplierCountryId = normalizeText(body.supplier_country_id)
    const supplierCityId = normalizeText(body.supplier_city_id)
    const hotel = getHotelCatalogItem(hotelId)

    if (!hotel && source !== "dharmawisata") {
      return NextResponse.json({ error: "Hotel tidak ditemukan di katalog." }, { status: 404 })
    }

    const checkin = normalizeText(body.checkin)
    const checkout = normalizeText(body.checkout)
    const adultCount = parsePositiveInteger(body.adults, 1, 1)
    const childCount = parsePositiveInteger(body.children, 0, 0)
    const roomCount = parsePositiveInteger(body.rooms, 1, 1)
    const customerName = normalizeText(body.customer_name)
    const customerPhone = normalizeText(body.customer_phone)
    const customerEmail = normalizeText(body.customer_email)
    const customerNote = normalizeText(body.customer_note)
    const roomPreference = normalizeText(body.room_preference)
    const mealPreference = normalizeText(body.meal_preference)
    const refundPreference = normalizeText(body.refund_preference)

    if (!isIsoDate(checkin) || !isIsoDate(checkout)) {
      return NextResponse.json({ error: "Tanggal check-in dan check-out harus valid." }, { status: 400 })
    }

    const nightCount = getHotelStayNights(checkin, checkout)
    if (nightCount <= 0) {
      return NextResponse.json({ error: "Tanggal check-out harus setelah check-in." }, { status: 400 })
    }

    if (!customerName || !customerPhone) {
      return NextResponse.json({ error: "Nama dan nomor WhatsApp wajib diisi." }, { status: 400 })
    }

    const liveHotelName = hotelNameFromBody || `Hotel Dharmawisata ${supplierHotelId || hotelId}`
    const liveHotelLocation = hotelLocationFromBody || supplierCityId || "Dharmawisata hotel"
    const estimate = hotel
      ? buildHotelEstimatedStayTotal(hotel, {
          destination: hotel.location,
          checkin,
          checkout,
          adults: adultCount,
          children: childCount,
          rooms: roomCount,
        })
      : {
          nights: nightCount,
          pricePerNight: 0,
          totalAmount: 0,
        }
    const supplierPayload = {
      source: source === "dharmawisata" ? "dharmawisata_h2h_live_catalog" : "hotel_catalog_manual_check",
      supplier_hotel_id: supplierHotelId || hotelId,
      supplier_internal_code: supplierInternalCode || supplierHotelId || null,
      supplier_country_id: supplierCountryId || null,
      supplier_city_id: supplierCityId || null,
    }
    const requestCode = generateHotelRequestCode()
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("hotel_availability_requests")
      .insert({
        request_code: requestCode,
        status: "availability_requested",
        hotel_id: hotel?.id || supplierHotelId || hotelId,
        hotel_name: hotel?.title || liveHotelName,
        hotel_location: hotel?.location || liveHotelLocation,
        hotel_region: hotel?.region || supplierCountryId || "Dharmawisata",
        property_type: hotel?.group || "Dharmawisata H2H",
        star_rating: hotel ? getHotelFactValue(hotel, "Star") : null,
        checkin_date: checkin,
        checkout_date: checkout,
        night_count: estimate.nights,
        adult_count: adultCount,
        child_count: childCount,
        room_count: roomCount,
        room_preference: roomPreference || null,
        meal_preference: mealPreference || null,
        refund_preference: refundPreference || null,
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_phone: customerPhone,
        customer_note: customerNote || null,
        estimated_price_per_night: estimate.pricePerNight,
        estimated_total_amount: estimate.totalAmount,
        currency: "IDR",
        source: supplierPayload.source,
        request_payload: {
          hotel: hotel || {
            id: hotelId,
            title: liveHotelName,
            location: liveHotelLocation,
            supplierHotelId,
            supplierInternalCode,
            supplierCountryId,
            supplierCityId,
          },
          search: {
            checkin,
            checkout,
            adults: adultCount,
            children: childCount,
            rooms: roomCount,
          },
          preferences: {
            roomPreference,
            mealPreference,
            refundPreference,
          },
          supplier: supplierPayload,
        },
        quote_payload: {
          ...supplierPayload,
        },
      })
      .select("id, request_code, status")
      .single()

    if (error) {
      return NextResponse.json({ error: "Request hotel belum bisa disimpan." }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      request: data,
      message: "Request availability hotel berhasil dikirim. Tim Red Feng akan menghubungi Anda untuk konfirmasi.",
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request hotel belum bisa diproses." },
      { status: 500 },
    )
  }
}
