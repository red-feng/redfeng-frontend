'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CompanyStep({
  merchantId,
  setStep
}: {
  merchantId: string
  setStep: (step: number) => void
}) {
  const supabase = createClient()

  const [form, setForm] = useState({
    company_name: '',
    brand_name: '',
    business_type: '',
    address: '',
    city: '',
    province: ''
  })

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const loadMerchant = async () => {
      const { data } = await supabase
        .from('merchants')
        .select('company_name, brand_name, business_type, address, city, province')
        .eq('id', merchantId)
        .maybeSingle()

      if (!data) return

      setForm({
        company_name: data.company_name ?? '',
        brand_name: data.brand_name ?? '',
        business_type: data.business_type ?? '',
        address: data.address ?? '',
        city: data.city ?? '',
        province: data.province ?? '',
      })
    }

    void loadMerchant()
  }, [merchantId, supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleNext = async () => {
    if (!form.company_name || !form.brand_name) {
      setErrorMsg('Company & Brand wajib diisi')
      return
    }

    setSaving(true)
    setErrorMsg('')

    const { error } = await supabase
      .from('merchants')
      .update({
        ...form,
        onboarding_step: 2
      })
      .eq('id', merchantId)

    if (error) {
      setErrorMsg(error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setStep(2)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Company Name</span>
          <input
            name="company_name"
            placeholder="PT Red Feng Digital Nusantara"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={form.company_name}
            onChange={handleChange}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Brand Name</span>
          <input
            name="brand_name"
            placeholder="Red Feng"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={form.brand_name}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Business Type</span>
          <select
            name="business_type"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={form.business_type}
            onChange={handleChange}
          >
            <option value="">Select business type</option>
            <option value="PT">PT</option>
            <option value="CV">CV</option>
            <option value="UMKM">UMKM</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Business Address</span>
          <input
            name="address"
            placeholder="Alamat operasional utama"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={form.address}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">City</span>
          <input
            name="city"
            placeholder="Jakarta"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={form.city}
            onChange={handleChange}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Province</span>
          <input
            name="province"
            placeholder="DKI Jakarta"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={form.province}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className="rounded-[24px] border border-orange-100 bg-[#fff9f2] px-5 py-4 text-sm leading-7 text-slate-600">
        Gunakan nama perusahaan dan brand yang sama dengan dokumen legal untuk mempercepat proses review admin.
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 md:flex-row md:items-center md:justify-between">
        {errorMsg ? <p className="text-sm text-red-600">{errorMsg}</p> : <div />}

        <button
          onClick={handleNext}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d86118_0%,#ef7f1a_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(216,97,24,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? 'Saving...' : 'Continue to Legal Identity'}
        </button>
      </div>
    </div>
  )
}
