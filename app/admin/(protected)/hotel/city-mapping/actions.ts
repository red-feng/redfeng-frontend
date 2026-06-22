"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getAccessibleInternalProducts, hasInternalProductAccess } from "@/lib/internal-product-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function normalizeText(value: FormDataEntryValue | null) {
  return String(value || "").replace(/\s+/g, " ").trim()
}

function normalizeDestinationKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
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

export async function saveHotelCityMappingAction(formData: FormData) {
  const id = normalizeText(formData.get("id"))
  const destinationLabel = normalizeText(formData.get("destination_label"))
  const destinationKey = normalizeDestinationKey(normalizeText(formData.get("destination_key")) || destinationLabel)
  const countryId = normalizeText(formData.get("country_id"))
  const cityId = normalizeText(formData.get("city_id"))
  const countryName = normalizeText(formData.get("country_name"))
  const cityName = normalizeText(formData.get("city_name"))
  const notes = normalizeText(formData.get("notes"))
  const isActive = formData.get("is_active") === "on"

  if (!destinationLabel || !destinationKey || !countryId || !cityId) {
    redirect("/admin/hotel/city-mapping?error=Destinasi,%20countryID,%20dan%20cityID%20wajib%20diisi")
  }

  const adminSupabase = await assertHotelAdminAccess()
  const payload = {
    destination_key: destinationKey,
    destination_label: destinationLabel,
    country_id: countryId,
    city_id: cityId,
    country_name: countryName || null,
    city_name: cityName || null,
    notes: notes || null,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }

  const query = id
    ? adminSupabase.from("dharmawisata_hotel_city_mappings").update(payload).eq("id", id)
    : adminSupabase.from("dharmawisata_hotel_city_mappings").upsert(payload, { onConflict: "destination_key" })

  const { error } = await query
  if (error) {
    redirect(`/admin/hotel/city-mapping?error=${encodeURIComponent(error.message || "Mapping belum bisa disimpan")}`)
  }

  revalidatePath("/admin/hotel/city-mapping")
  revalidatePath("/hotel/catalog")
  redirect("/admin/hotel/city-mapping?success=Mapping%20kota%20hotel%20disimpan")
}

export async function toggleHotelCityMappingAction(formData: FormData) {
  const id = normalizeText(formData.get("id"))
  const nextActive = formData.get("next_active") === "true"
  if (!id) redirect("/admin/hotel/city-mapping?error=Mapping%20tidak%20valid")

  const adminSupabase = await assertHotelAdminAccess()
  const { error } = await adminSupabase
    .from("dharmawisata_hotel_city_mappings")
    .update({
      is_active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    redirect(`/admin/hotel/city-mapping?error=${encodeURIComponent(error.message || "Status mapping belum bisa diubah")}`)
  }

  revalidatePath("/admin/hotel/city-mapping")
  revalidatePath("/hotel/catalog")
  redirect("/admin/hotel/city-mapping?success=Status%20mapping%20diubah")
}
