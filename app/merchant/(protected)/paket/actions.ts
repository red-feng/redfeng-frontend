"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return "Terjadi kesalahan. Silakan coba lagi."
}

async function getOwnedMerchantPackage(packageId: string) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Sesi login berakhir. Silakan login ulang.")
  }

  const { data: merchant, error: merchantError } = await adminSupabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (merchantError || !merchant) {
    throw new Error("Data merchant tidak ditemukan.")
  }

  const { data: pkg, error: pkgError } = await adminSupabase
    .from("packages")
    .select("id, merchant_id, status, cover_image")
    .eq("id", packageId)
    .eq("merchant_id", merchant.id)
    .single()

  if (pkgError || !pkg) {
    throw new Error("Anda tidak memiliki akses ke paket ini.")
  }

  return { user, merchant, pkg, supabase, adminSupabase }
}

export async function updatePackage(formData: FormData) {
  const packageId = String(formData.get("package_id") || "")

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

    const { adminSupabase } = await getOwnedMerchantPackage(packageId)

    const title = String(formData.get("title") || "").trim()
    const travelStyle = String(formData.get("travel_style") || "").trim()
    const originCountryId = String(formData.get("origin_country_id") || "").trim()
    const originProvince = String(formData.get("origin_province") || "").trim()
    const destinationCountryId = String(formData.get("destination_country_id") || "").trim()
    const destinationProvince = String(formData.get("destination_province") || "").trim()
    const currency = String(formData.get("currency") || "IDR").trim()
    const minimalPeserta = Number(formData.get("minimal_peserta") || 1)
    const duration = Number(formData.get("duration_days") || 0)
    const priceAdult = Number(formData.get("price_adult") || 0)
    const priceChild = Number(formData.get("price_child") || 0)

    if (!title) throw new Error("Nama paket wajib diisi.")
    if (!travelStyle) throw new Error("Travel style wajib dipilih.")
    if (!originCountryId || !destinationCountryId) throw new Error("Negara asal dan tujuan wajib dipilih.")

    const payload = {
      title,
      travel_style: travelStyle,
      origin_country_id: originCountryId,
      origin_province: originProvince,
      destination_country_id: destinationCountryId,
      destination_province: destinationProvince,
      currency,
      minimal_peserta: minimalPeserta,
      duration,
      price_adult: priceAdult,
      price_child: priceChild,
      updated_at: new Date().toISOString(),
    }

    const { error } = await adminSupabase
      .from("packages")
      .update(payload)
      .eq("id", packageId)

    if (error) {
      throw new Error(`Gagal menyimpan perubahan paket: ${error.message}`)
    }

    revalidatePath("/merchant/paket")
    revalidatePath(`/merchant/paket/${packageId}/edit`)
  } catch (error) {
    redirect(`/merchant/paket/${packageId}/edit?error=${encodeURIComponent(getErrorMessage(error))}`)
  }

  redirect("/merchant/paket?success=Paket berhasil diperbarui")
}

export async function deletePackage(formData: FormData) {
  const packageId = String(formData.get("package_id") || "")
  const returnStatus = String(formData.get("return_status") || "draft").trim()

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")

    const { adminSupabase } = await getOwnedMerchantPackage(packageId)

    const { count: bookingCount, error: bookingError } = await adminSupabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("package_id", packageId)

    if (bookingError) {
      throw new Error(`Gagal memeriksa booking paket: ${bookingError.message}`)
    }

    if ((bookingCount || 0) > 0) {
      throw new Error("Paket tidak bisa dihapus karena sudah memiliki booking customer.")
    }

    const { data: itineraryDays, error: itineraryError } = await adminSupabase
      .from("package_itinerary_days")
      .select("id")
      .eq("package_id", packageId)

    if (itineraryError) {
      throw new Error(`Gagal memuat itinerary paket: ${itineraryError.message}`)
    }

    const itineraryDayIds = (itineraryDays || []).map((item) => item.id)

    if (itineraryDayIds.length > 0) {
      const { error: deleteRoutesError } = await adminSupabase
        .from("package_itinerary_routes")
        .delete()
        .in("itinerary_day_id", itineraryDayIds)

      if (deleteRoutesError) {
        throw new Error(`Gagal menghapus itinerary routes: ${deleteRoutesError.message}`)
      }
    }

    const deleteSteps = [
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
      throw new Error(`Gagal menghapus paket: ${deletePackageError.message}`)
    }

    revalidatePath("/merchant/paket")
  } catch (error) {
    const errorPath =
      returnStatus
        ? `/merchant/paket?status=${encodeURIComponent(returnStatus)}&error=${encodeURIComponent(getErrorMessage(error))}`
        : `/merchant/paket?error=${encodeURIComponent(getErrorMessage(error))}`
    redirect(errorPath)
  }

  const successPath =
    returnStatus
      ? `/merchant/paket?status=${encodeURIComponent(returnStatus)}&success=${encodeURIComponent("Paket berhasil dihapus")}`
      : `/merchant/paket?success=${encodeURIComponent("Paket berhasil dihapus")}`

  redirect(successPath)
}

export async function togglePackageStatus(formData: FormData) {
  const packageId = String(formData.get("package_id") || "")
  const targetStatus = String(formData.get("target_status") || "").trim()
  const returnStatus = String(formData.get("return_status") || "draft").trim()

  try {
    if (!packageId) throw new Error("Package ID tidak ditemukan.")
    if (!["approved", "inactive"].includes(targetStatus)) {
      throw new Error("Status tujuan tidak valid.")
    }

    const { adminSupabase } = await getOwnedMerchantPackage(packageId)

    const { error } = await adminSupabase
      .from("packages")
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", packageId)

    if (error) {
      throw new Error(`Gagal memperbarui status paket: ${error.message}`)
    }

    revalidatePath("/merchant/paket")
  } catch (error) {
    const errorPath =
      returnStatus
        ? `/merchant/paket?status=${encodeURIComponent(returnStatus)}&error=${encodeURIComponent(getErrorMessage(error))}`
        : `/merchant/paket?error=${encodeURIComponent(getErrorMessage(error))}`
    redirect(errorPath)
  }

  const successMessage =
    targetStatus === "approved" ? "Paket berhasil diaktifkan" : "Paket berhasil dinonaktifkan"
  const successPath =
    returnStatus
      ? `/merchant/paket?status=${encodeURIComponent(returnStatus)}&success=${encodeURIComponent(successMessage)}`
      : `/merchant/paket?success=${encodeURIComponent(successMessage)}`

  redirect(successPath)
}
