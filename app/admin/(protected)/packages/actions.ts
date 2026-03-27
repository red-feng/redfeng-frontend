"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { purgePackageRecords } from "@/lib/package-delete"
import { createClient } from "@/lib/supabase/server"
import { createAdminAuditLog } from "@/lib/admin-audit"
import { isAdminExecutionRole } from "@/lib/internal-roles"

function backToPackages(type: "success" | "error", message: string) {
  redirect(`/admin/packages?${type}=${encodeURIComponent(message)}`)
}

function getPackageIds(formData: FormData) {
  return formData
    .getAll("packageIds")
    .map((value) => String(value || "").trim())
    .filter(Boolean)
}

async function getAdminActor() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Sesi admin tidak ditemukan.")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !isAdminExecutionRole(profile.role)) {
    throw new Error("Akses admin tidak valid.")
  }

  return {
    id: user.id,
    role: profile.role,
  }
}

function assertSuperadmin(role: string) {
  if (role !== "superadmin") {
    throw new Error("Hanya superadmin yang dapat menghapus package secara permanen.")
  }
}

export async function approvePackageById(packageId: string) {
  if (!packageId) {
    throw new Error("Package ID tidak ditemukan.")
  }

  const supabase = createAdminClient()
  const actor = await getAdminActor()

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

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "package",
    targetId: packageId,
    action: "approve",
    summary: `Package ${packageId} disetujui admin`,
    metadata: {
      status: "approved",
    },
  })
}

export async function rejectPackageById(packageId: string, reason: string) {
  if (!packageId || !reason.trim()) {
    throw new Error("Data penolakan paket tidak lengkap.")
  }

  const supabase = createAdminClient()
  const actor = await getAdminActor()

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

  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "package",
    targetId: packageId,
    action: "reject",
    summary: `Package ${packageId} ditolak admin`,
    metadata: {
      status: "rejected",
      reason: reason.trim(),
    },
  })
}

export async function deletePackageById(packageId: string) {
  const supabase = createAdminClient()
  const actor = await getAdminActor()
  assertSuperadmin(actor.role)
  await purgePackageRecords(supabase, packageId)
  await createAdminAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    targetType: "package",
    targetId: packageId,
    action: "delete",
    summary: `Package ${packageId} dihapus permanen`,
    metadata: {
      mode: "permanent_delete",
    },
  })
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

export async function bulkApprovePackages(formData: FormData) {
  try {
    const packageIds = getPackageIds(formData)
    if (!packageIds.length) {
      throw new Error("Pilih minimal satu paket.")
    }

    for (const packageId of packageIds) {
      await approvePackageById(packageId)
    }
  } catch (error) {
    backToPackages("error", error instanceof Error ? error.message : "Gagal approve paket massal")
  }

  backToPackages("success", "Paket terpilih berhasil disetujui")
}

export async function bulkRejectPackages(formData: FormData) {
  try {
    const packageIds = getPackageIds(formData)
    const reason = String(formData.get("reason") || "").trim()

    if (!packageIds.length) {
      throw new Error("Pilih minimal satu paket.")
    }

    if (!reason) {
      throw new Error("Alasan penolakan wajib diisi untuk bulk reject.")
    }

    for (const packageId of packageIds) {
      await rejectPackageById(packageId, reason)
    }
  } catch (error) {
    backToPackages("error", error instanceof Error ? error.message : "Gagal reject paket massal")
  }

  backToPackages("success", "Paket terpilih berhasil ditolak")
}

export async function bulkDeletePackages(formData: FormData) {
  try {
    const packageIds = getPackageIds(formData)
    if (!packageIds.length) {
      throw new Error("Pilih minimal satu paket.")
    }

    for (const packageId of packageIds) {
      await deletePackageById(packageId)
    }
  } catch (error) {
    backToPackages("error", error instanceof Error ? error.message : "Gagal hapus paket massal")
  }

  backToPackages("success", "Paket terpilih berhasil dihapus permanen")
}
