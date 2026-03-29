"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

function getValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim()
}

export async function updateMerchantProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/merchant/login")
  }

  const companyName = getValue(formData, "company_name")
  const brandName = getValue(formData, "brand_name")

  if (!companyName || !brandName) {
    redirect("/merchant/profil?error=Nama%20bisnis%20dan%20nama%20brand%20wajib%20diisi")
  }

  const payload = {
    company_name: companyName,
    brand_name: brandName,
    address: getValue(formData, "address"),
    city: getValue(formData, "city"),
    province: getValue(formData, "province"),
    pic_name: getValue(formData, "pic_name"),
    pic_position: getValue(formData, "pic_position"),
    ktp_number: getValue(formData, "ktp_number"),
    bank_name: getValue(formData, "bank_name"),
    bank_branch: getValue(formData, "bank_branch"),
    bank_account_holder: getValue(formData, "bank_account_holder"),
    bank_account_number: getValue(formData, "bank_account_number"),
    npwp_personal: getValue(formData, "npwp_personal"),
    npwp_company: getValue(formData, "npwp_company"),
    nib: getValue(formData, "nib"),
  }

  const { error } = await supabase.from("merchants").update(payload).eq("user_id", user.id)

  if (error) {
    redirect(`/merchant/profil?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath("/merchant/profil")
  redirect("/merchant/profil?success=Profil%20merchant%20berhasil%20diperbarui")
}
