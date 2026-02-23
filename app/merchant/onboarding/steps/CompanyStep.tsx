'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CompanyStep({ merchantId }: { merchantId: string }) {
  const supabase = createClient()
  const router = useRouter()

  const [form, setForm] = useState({
    company_name: '',
    brand_name: '',
    business_type: '',
    address: '',
    city: '',
    province: ''
  })

  const [saving, setSaving] = useState(false)

  const handleChange = (e: any) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleNext = async () => {
    if (!form.company_name || !form.brand_name) {
      alert('Company & Brand wajib diisi')
      return
    }

    setSaving(true)

    await supabase
      .from('merchants')
      .update({
        ...form,
        onboarding_step: 2
      })
      .eq('id', merchantId)

    setSaving(false)

    // nanti kita buat step 2
    alert('Step 1 saved. Step 2 coming next.')
  }

  return (
    <div className="space-y-4">

      <input
        name="company_name"
        placeholder="Company Name"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <input
        name="brand_name"
        placeholder="Brand Name"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <select
        name="business_type"
        className="w-full border p-2"
        onChange={handleChange}
      >
        <option value="">Select Business Type</option>
        <option value="PT">PT</option>
        <option value="CV">CV</option>
        <option value="UMKM">UMKM</option>
      </select>

      <input
        name="address"
        placeholder="Address"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <input
        name="city"
        placeholder="City"
        className="w-full border p-2"
        onChange={handleChange}
      />

      <input
        name="province"
        placeholder="Province"
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