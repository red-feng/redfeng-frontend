"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { purgePackageRecords } from "@/lib/package-delete"

function backToPackages(type: "success" | "error", message: string) {
  redirect(`/admin/packages?${type}=${encodeURIComponent(message)}`)
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
  const supabase = createAdminClient()
  await purgePackageRecords(supabase, packageId)
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
