"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getAccessibleInternalProducts, hasInternalProductAccess } from "@/lib/internal-product-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const HOTEL_REQUEST_STATUSES = new Set([
  "availability_requested",
  "checking_supplier",
  "available",
  "unavailable",
  "quote_sent",
  "converted",
  "cancelled",
])

function normalizeText(value: FormDataEntryValue | null) {
  return String(value || "").replace(/\s+/g, " ").trim()
}

async function assertHotelAdminAccess() {
  const supabase = await createClient("admin")
  const adminSupabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/admin/login?error=no-session")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const accessibleProducts = await getAccessibleInternalProducts(adminSupabase, user.id, profile?.role)
  if (!hasInternalProductAccess(accessibleProducts, "hotel", "execute")) {
    redirect("/admin/dashboard?error=Akses%20produk%20tidak%20diizinkan")
  }

  return adminSupabase
}

export async function updateHotelAvailabilityRequestAction(formData: FormData) {
  const requestId = normalizeText(formData.get("request_id"))
  const status = normalizeText(formData.get("status"))
  const adminNote = normalizeText(formData.get("admin_note"))
  const quotedTotalAmountRaw = normalizeText(formData.get("quoted_total_amount"))
  const quotedTotalAmount = quotedTotalAmountRaw ? Number(quotedTotalAmountRaw) : null

  if (!requestId || !HOTEL_REQUEST_STATUSES.has(status)) {
    redirect("/admin/hotel?error=Request%20hotel%20tidak%20valid")
  }

  if (quotedTotalAmountRaw && (!Number.isFinite(quotedTotalAmount) || Number(quotedTotalAmount) < 0)) {
    redirect("/admin/hotel?error=Quote%20hotel%20tidak%20valid")
  }

  const adminSupabase = await assertHotelAdminAccess()
  const { error } = await adminSupabase
    .from("hotel_availability_requests")
    .update({
      status,
      quoted_total_amount: quotedTotalAmount,
      quote_payload: {
        admin_note: adminNote,
        quoted_total_amount: quotedTotalAmount,
        updated_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  if (error) {
    redirect("/admin/hotel?error=Request%20hotel%20belum%20bisa%20diupdate")
  }

  revalidatePath("/admin/hotel")
  redirect("/admin/hotel?success=Request%20hotel%20diupdate")
}
