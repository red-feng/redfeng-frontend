"use server"

import { approvePackageById, deletePackageById, rejectPackageById } from "../actions"
import { redirect } from "next/navigation"

export async function approvePackage(packageId: string, revisionId?: string | null) {
  await approvePackageById(packageId, revisionId)
  redirect("/admin/packages?success=Paket%20berhasil%20disetujui")
}

export async function rejectPackage(packageId: string, reason: string, revisionId?: string | null) {
  await rejectPackageById(packageId, reason, revisionId)
  redirect("/admin/packages?success=Paket%20berhasil%20ditolak")
}

export async function deletePackage(packageId: string) {
  await deletePackageById(packageId)
  redirect("/admin/packages?success=Paket%20berhasil%20dihapus%20permanen")
}
