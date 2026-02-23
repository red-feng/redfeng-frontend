'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LegalStep({ merchantId }: { merchantId: string }) {
  const supabase = createClient()

  const [form, setForm] = useState({
    pic_name: '',
    pic_position: '',
    ktp_number: '',
    npwp_personal: '',
    npwp_company: ''
  })

  const [saving, setSaving] = useState(false)

  const handleChange = (e: any) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleNext = async () => {
    if (!form.pic_name || !form.ktp_number) {
      alert('PIC Name & KTP wajib diisi')
      return
    }

    setSaving(true)

    await supabase
      .from('merchants')
      .update({
        ...form,
        onboarding_step: 3
      })
      .eq('id', merchantId)

    setSaving(false)

    window.location.reload()
  }

  return (
    <div className="space-y-4">

      <input
        name="pic_name"
        placeholder="PIC Name"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <input
        name="pic_position"
        placeholder="PIC Position"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <input
        name="ktp_number"
        placeholder="KTP Number"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <input
        name="npwp_personal"
        placeholder="NPWP Personal"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <input
        name="npwp_company"
        placeholder="NPWP Company"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <button
        onClick={handleNext}
        disabled={saving}
        className="bg-black text-white px-6 py-2"
      >
        {saving ? 'Saving...' : 'Next'}
      </button>

    </div>
  )
}