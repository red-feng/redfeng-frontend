'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DocumentsStep({ merchantId }: { merchantId: string }) {
  const supabase = createClient()
  const router = useRouter()

  const [saving, setSaving] = useState(false)

  const uploadFile = async (file: File, folder: string) => {
    const filePath = `${folder}/${merchantId}-${Date.now()}-${file.name}`

    const { error } = await supabase.storage
      .from('merchant-documents')
      .upload(filePath, file)

    if (error) {
      alert(error.message)
      return null
    }

    const { data } = supabase.storage
      .from('merchant-documents')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setSaving(true)

    const ktpFile = e.target.ktp.files[0]
    const npwpFile = e.target.npwp.files[0]
    const nibFile = e.target.nib.files[0]
    const logoFile = e.target.logo.files[0]

    const ktpUrl = ktpFile ? await uploadFile(ktpFile, 'ktp') : null
    const npwpUrl = npwpFile ? await uploadFile(npwpFile, 'npwp') : null
    const nibUrl = nibFile ? await uploadFile(nibFile, 'nib') : null
    const logoUrl = logoFile ? await uploadFile(logoFile, 'logo') : null

    await supabase
      .from('merchants')
      .update({
        ktp_file_url: ktpUrl,
        npwp_file_url: npwpUrl,
        nib_file_url: nibUrl,
        logo_url: logoUrl,
        onboarding_completed: true,
        verification_status: 'pending'
      })
      .eq('id', merchantId)

    setSaving(false)

    router.push('/merchant/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div>
        <label>KTP</label>
        <input type="file" name="ktp" required />
      </div>

      <div>
        <label>NPWP</label>
        <input type="file" name="npwp" required />
      </div>

      <div>
        <label>NIB</label>
        <input type="file" name="nib" required />
      </div>

      <div>
        <label>Logo</label>
        <input type="file" name="logo" />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-black text-white px-6 py-2"
      >
        {saving ? 'Uploading...' : 'Finish & Submit'}
      </button>

    </form>
  )
}