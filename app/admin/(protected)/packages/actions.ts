"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

function backToPackages(type: "success" | "error", message: string) {
  redirect(`/admin/packages?${type}=${encodeURIComponent(message)}`)
}

async function purgePackageById(packageId: string) {
  if (!packageId) {
    throw new Error("Package ID tidak ditemukan.")
  }

  const supabase = createAdminClient()

  const { data: pkg, error: packageError } = await supabase
    .from("packages")
    .select("id")
    .eq("id", packageId)
    .maybeSingle()

  if (packageError) {
    throw new Error(`Gagal memuat paket: ${packageError.message}`)
  }

  if (!pkg) {
    throw new Error("Paket tidak ditemukan atau sudah terhapus.")
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id")
    .eq("package_id", packageId)

  if (bookingsError) {
    throw new Error(`Gagal memuat booking paket: ${bookingsError.message}`)
  }

  const bookingIds = (bookings || []).map((booking) => booking.id)

  if (bookingIds.length > 0) {
    const { error: payoutDeleteError } = await supabase
      .from("payout_requests")
      .delete()
      .in("booking_id", bookingIds)

    if (payoutDeleteError) {
      throw new Error(`Gagal menghapus payout paket: ${payoutDeleteError.message}`)
    }

    const { error: bookingsDeleteError } = await supabase
      .from("bookings")
      .delete()
      .in("id", bookingIds)

    if (bookingsDeleteError) {
      throw new Error(`Gagal menghapus booking paket: ${bookingsDeleteError.message}`)
    }
  }

  const { data: itineraryDays, error: itineraryError } = await supabase
    .from("package_itinerary_days")
    .select("id")
    .eq("package_id", packageId)

  if (itineraryError) {
    throw new Error(`Gagal memuat itinerary paket: ${itineraryError.message}`)
  }

  const itineraryDayIds = (itineraryDays || []).map((item) => item.id)

  if (itineraryDayIds.length > 0) {
    const { error: routesDeleteError } = await supabase
      .from("package_itinerary_routes")
      .delete()
      .in("itinerary_day_id", itineraryDayIds)

    if (routesDeleteError) {
      throw new Error(`Gagal menghapus itinerary route: ${routesDeleteError.message}`)
    }
  }

  const deleteSteps = [
    supabase.from("package_chat_rooms").delete().eq("package_id", packageId),
    supabase.from("package_reviews").delete().eq("package_id", packageId),
    supabase.from("package_views").delete().eq("package_id", packageId),
    supabase.from("package_images").delete().eq("package_id", packageId),
    supabase.from("package_facilities").delete().eq("package_id", packageId),
    supabase.from("package_tags").delete().eq("package_id", packageId),
    supabase.from("package_translations").delete().eq("package_id", packageId),
    supabase.from("package_details").delete().eq("package_id", packageId),
    supabase.from("package_itinerary_days").delete().eq("package_id", packageId),
  ]

  for (const step of deleteSteps) {
    const { error } = await step
    if (error) {
      throw new Error(`Gagal membersihkan data paket: ${error.message}`)
    }
  }

  const { error: deletePackageError } = await supabase
    .from("packages")
    .delete()
    .eq("id", packageId)

  if (deletePackageError) {
    throw new Error(`Gagal menghapus paket utama: ${deletePackageError.message}`)
  }

  revalidatePath("/")
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/packages")
}

export async function approvePackageById(packageId: string) {
  if (!packageId) {
    throw new Error("Package ID tidak ditemukan.")
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from("packages")
    .update({
      status: "approved",
      reviewed_at: new Date(),
      rejection_reason: null,
    })
    .eq("id", packageId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/")
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/packages")
}

export async function rejectPackageById(packageId: string, reason: string) {
  if (!packageId || !reason.trim()) {
    throw new Error("Data penolakan paket tidak lengkap.")
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from("packages")
    .update({
      status: "rejected",
      rejection_reason: reason.trim(),
      reviewed_at: new Date(),
    })
    .eq("id", packageId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/packages")
}

export async function deletePackageById(packageId: string) {
  await purgePackageById(packageId)
}

export async function approvePackage(formData: FormData) {
  try {
    const packageId = String(formData.get("packageId") || "")
    await approvePackageById(packageId)
  } catch (error) {
    backToPackages("error", error instanceof Error ? error.message : "Gagal menyetujui paket")
  }

  backToPackages("success", "Paket berhasil disetujui")
}

export async function rejectPackage(formData: FormData) {
  try {
    const packageId = String(formData.get("packageId") || "")
    const reason = String(formData.get("reason") || "")
    await rejectPackageById(packageId, reason)
  } catch (error) {
    backToPackages("error", error instanceof Error ? error.message : "Gagal menolak paket")
  }

  backToPackages("success", "Paket berhasil ditolak")
}

export async function deletePackage(formData: FormData) {
  try {
    const packageId = String(formData.get("packageId") || "")
    await deletePackageById(packageId)
  } catch (error) {
    backToPackages("error", error instanceof Error ? error.message : "Gagal menghapus paket")
  }

  backToPackages("success", "Paket berhasil dihapus permanen")
}
