import type { SupabaseClient } from "@supabase/supabase-js"
import { purgePackageRecords } from "@/lib/package-delete"

const MERCHANT_DOCUMENT_BUCKET = "merchant-documents"

function extractStoragePathFromPublicUrl(url: string | null | undefined, bucket: string) {
  const raw = String(url || "").trim()
  if (!raw) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = raw.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(raw.slice(index + marker.length))
}

async function removeMerchantDocumentObjects(
  supabase: SupabaseClient,
  documentUrls: Array<string | null | undefined>,
) {
  const objectPaths = documentUrls
    .map((url) => extractStoragePathFromPublicUrl(url, MERCHANT_DOCUMENT_BUCKET))
    .filter((path): path is string => Boolean(path))

  if (!objectPaths.length) return

  const { error } = await supabase.storage.from(MERCHANT_DOCUMENT_BUCKET).remove(objectPaths)
  if (error) {
    console.error("Remove merchant document objects error:", error)
  }
}

export async function purgeMerchantAccountRecords(
  adminSupabase: SupabaseClient,
  merchant: {
    id: string
    user_id?: string | null
    ktp_file_url?: string | null
    npwp_file_url?: string | null
    nib_file_url?: string | null
    logo_url?: string | null
  },
) {
  const { data: packageRows, error: packageRowsError } = await adminSupabase
    .from("packages")
    .select("id")
    .eq("merchant_id", merchant.id)

  if (packageRowsError) {
    throw new Error(`Gagal memuat paket merchant: ${packageRowsError.message}`)
  }

  const packageIds = (((packageRows as Array<{ id: string }> | null) || []) as Array<{ id: string }>)
    .map((item) => item.id)
    .filter(Boolean)

  for (const packageId of packageIds) {
    await purgePackageRecords(adminSupabase, packageId)
  }

  await removeMerchantDocumentObjects(adminSupabase, [
    merchant.ktp_file_url,
    merchant.npwp_file_url,
    merchant.nib_file_url,
    merchant.logo_url,
  ])

  const { error: refundDeleteError } = await adminSupabase
    .from("refund_requests")
    .delete()
    .eq("merchant_id", merchant.id)

  if (refundDeleteError) {
    throw new Error(`Gagal menghapus refund merchant: ${refundDeleteError.message}`)
  }

  const { error: merchantDeleteError } = await adminSupabase
    .from("merchants")
    .delete()
    .eq("id", merchant.id)

  if (merchantDeleteError) {
    throw new Error(`Gagal menghapus data merchant utama: ${merchantDeleteError.message}`)
  }

  if (!merchant.user_id) return

  const { error: profileDeleteError } = await adminSupabase
    .from("profiles")
    .delete()
    .eq("id", merchant.user_id)

  if (profileDeleteError) {
    throw new Error(`Gagal menghapus profil merchant: ${profileDeleteError.message}`)
  }

  const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(merchant.user_id)
  if (authDeleteError) {
    throw new Error(`Gagal menghapus akun auth merchant: ${authDeleteError.message}`)
  }
}

export async function runExpiredMerchantRevisionCleanup(
  supabase: SupabaseClient,
  now = new Date(),
) {
  const nowIso = now.toISOString()
  const { data: merchantsToPurge, error } = await supabase
    .from("merchants")
    .select(
      "id, user_id, email, brand_name, company_name, verification_status, revision_deadline_at, purge_scheduled_at, ktp_file_url, npwp_file_url, nib_file_url, logo_url",
    )
    .in("verification_status", ["rejected", "revision_requested", "expired"])
    .or(`revision_deadline_at.lte.${nowIso},purge_scheduled_at.lte.${nowIso}`)

  if (error) {
    return {
      ok: false as const,
      error: error.message || "Gagal membaca merchant expired",
      scannedCount: 0,
      purgedCount: 0,
      failedCount: 0,
    }
  }

  let purgedCount = 0
  let failedCount = 0

  for (const merchant of merchantsToPurge || []) {
    const merchantName = merchant.brand_name || merchant.company_name || merchant.email || merchant.id

    const { error: markExpiredError } = await supabase
      .from("merchants")
      .update({
        verification_status: "expired",
        expired_at: merchant.revision_deadline_at || nowIso,
      })
      .eq("id", merchant.id)

    if (markExpiredError) {
      console.error("Mark expired merchant error:", markExpiredError)
      failedCount += 1
      continue
    }

    try {
      await purgeMerchantAccountRecords(supabase, {
        id: merchant.id,
        user_id: merchant.user_id,
        ktp_file_url: merchant.ktp_file_url,
        npwp_file_url: merchant.npwp_file_url,
        nib_file_url: merchant.nib_file_url,
        logo_url: merchant.logo_url,
      })
      purgedCount += 1
    } catch (purgeError) {
      console.error(`Purge expired merchant error for ${merchantName}:`, purgeError)
      failedCount += 1
    }
  }

  return {
    ok: true as const,
    error: null,
    scannedCount: (merchantsToPurge || []).length,
    purgedCount,
    failedCount,
  }
}
