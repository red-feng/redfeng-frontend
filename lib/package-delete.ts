import { revalidatePath } from "next/cache"

// Supabase query builder generic-nya sangat dalam untuk helper reusable ini.
// Di sini kita sengaja longgarkan agar helper yang sama bisa dipakai admin dan merchant actions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function purgePackageRecords(adminSupabase: any, packageId: string) {
  if (!packageId) {
    throw new Error("Package ID tidak ditemukan.")
  }

  const { data: pkg, error: packageError } = await adminSupabase
    .from("packages")
    .select("id")
    .eq("id", packageId)

  if (packageError) {
    throw new Error(`Gagal memuat paket: ${packageError.message}`)
  }

  const packageRows = Array.isArray(pkg) ? pkg : []
  if (!packageRows.length) {
    throw new Error("Paket tidak ditemukan atau sudah terhapus.")
  }

  const { data: bookings, error: bookingsError } = await adminSupabase
    .from("bookings")
    .select("id")
    .eq("package_id", packageId)

  if (bookingsError) {
    throw new Error(`Gagal memuat booking paket: ${bookingsError.message}`)
  }

  const bookingIds = (Array.isArray(bookings) ? bookings : []).map((booking) =>
    typeof booking === "object" && booking !== null && "id" in booking ? (booking as { id: string }).id : "",
  ).filter(Boolean)

  if (bookingIds.length > 0) {
    const { error: payoutDeleteError } = await adminSupabase
      .from("payout_requests")
      .delete()
      .in("booking_id", bookingIds)

    if (payoutDeleteError) {
      throw new Error(`Gagal menghapus payout paket: ${payoutDeleteError.message}`)
    }

    const { error: bookingsDeleteError } = await adminSupabase
      .from("bookings")
      .delete()
      .in("id", bookingIds)

    if (bookingsDeleteError) {
      throw new Error(`Gagal menghapus booking paket: ${bookingsDeleteError.message}`)
    }
  }

  const { data: itineraryDays, error: itineraryError } = await adminSupabase
    .from("package_itinerary_days")
    .select("id")
    .eq("package_id", packageId)

  if (itineraryError) {
    throw new Error(`Gagal memuat itinerary paket: ${itineraryError.message}`)
  }

  const itineraryDayIds = (Array.isArray(itineraryDays) ? itineraryDays : []).map((item) =>
    typeof item === "object" && item !== null && "id" in item ? (item as { id: string }).id : "",
  ).filter(Boolean)

  if (itineraryDayIds.length > 0) {
    const { error: routesDeleteError } = await adminSupabase
      .from("package_itinerary_routes")
      .delete()
      .in("itinerary_day_id", itineraryDayIds)

    if (routesDeleteError) {
      throw new Error(`Gagal menghapus itinerary route: ${routesDeleteError.message}`)
    }
  }

  const deleteSteps = [
    adminSupabase.from("package_chat_rooms").delete().eq("package_id", packageId),
    adminSupabase.from("package_reviews").delete().eq("package_id", packageId),
    adminSupabase.from("package_views").delete().eq("package_id", packageId),
    adminSupabase.from("package_images").delete().eq("package_id", packageId),
    adminSupabase.from("package_facilities").delete().eq("package_id", packageId),
    adminSupabase.from("package_tags").delete().eq("package_id", packageId),
    adminSupabase.from("package_translations").delete().eq("package_id", packageId),
    adminSupabase.from("package_details").delete().eq("package_id", packageId),
    adminSupabase.from("package_itinerary_days").delete().eq("package_id", packageId),
  ]

  for (const step of deleteSteps) {
    const { error } = await step
    if (error) {
      throw new Error(`Gagal membersihkan data paket: ${error.message}`)
    }
  }

  const { error: deletePackageError } = await adminSupabase
    .from("packages")
    .delete()
    .eq("id", packageId)

  if (deletePackageError) {
    throw new Error(`Gagal menghapus paket utama: ${deletePackageError.message}`)
  }

  revalidatePath("/")
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/packages")
  revalidatePath("/merchant/paket")
}
