'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveMerchant(formData: FormData) {
  const supabase = await createClient()
  const merchantId = formData.get('merchantId') as string

  if (!merchantId) return

  // 1️⃣ Ambil merchant + pastikan masih pending
  const { data: merchant, error: fetchError } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', merchantId)
    .eq('verification_status', 'pending')
    .single()

  if (fetchError || !merchant) {
    console.error('Merchant not found or already processed')
    return
  }

  // 2️⃣ Update verification_status
  const { error: updateError } = await supabase
    .from('merchants')
    .update({
      verification_status: 'approved',
      approved_at: new Date()
    })
    .eq('id', merchantId)

  if (updateError) {
    console.error('Failed updating merchant:', updateError)
    return
  }

  // 3️⃣ Aktifkan profile login
  await supabase
    .from('profiles')
    .update({
      status: 'active'
    })
    .eq('id', merchant.user_id)

  // 4️⃣ Kirim email (jangan block approval kalau email gagal)
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/send-merchant-approved`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: merchant.email,
          brandName: merchant.brand_name
        })
      }
    )
  } catch (emailError) {
    console.error('Email failed but merchant approved:', emailError)
  }

  revalidatePath('/admin/merchants')
}

export async function rejectMerchant(formData: FormData) {
  const supabase = await createClient()

  const merchantId = formData.get("merchantId") as string
  const reason = formData.get("reason") as string

  if (!merchantId || !reason) return

  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", merchantId)
    .single()

  if (!merchant) return

  await supabase
    .from("merchants")
    .update({
      verification_status: "rejected",
      rejection_reason: reason,
      rejected_at: new Date(),
    })
    .eq("id", merchantId)

  // kirim email reject
  await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/send-merchant-rejected`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: merchant.email,
        brandName: merchant.brand_name,
        reason,
      }),
    }
  )

  revalidatePath("/admin/merchants")
}