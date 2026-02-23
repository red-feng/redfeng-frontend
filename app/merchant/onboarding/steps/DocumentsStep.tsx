'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DocumentsStep({ merchantId }: { merchantId: string }) {
  const supabase = createClient()
  const router = useRouter()

  const [form, setForm] = useState({
    ktp_file_url: '',
    npwp_file_url: '',
    nib_file_url: '',
    logo_url: ''
  })

  const [saving, setSaving] = useState(false)

  const handleChange = (e: any) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleFinish = async () => {
    setSaving(true)

    await supabase
      .from('merchants')
      .update({
        ...form,
        onboarding_completed: true,
        verification_status: 'pending'
      })
      .eq('id', merchantId)

    setSaving(false)

    router.push('/merchant/dashboard')
  }

  return (
    <div className="space-y-4">

      <input
        name="ktp_file_url"
        placeholder="KTP File URL"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <input
        name="npwp_file_url"
        placeholder="NPWP File URL"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <input
        name="nib_file_url"
        placeholder="NIB File URL"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <input
        name="logo_url"
        placeholder="Logo URL"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <button
        onClick={handleFinish}
        disabled={saving}
        className="bg-black text-white px-6 py-2"
      >
        {saving ? 'Submitting...' : 'Finish & Submit'}
      </button>

    </div>
  )
}