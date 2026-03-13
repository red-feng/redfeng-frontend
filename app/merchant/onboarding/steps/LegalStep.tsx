'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LegalStep({
  merchantId,
  setStep
}: {
  merchantId: string
  setStep: (step: number) => void
}) {
  const supabase = createClient()

  const [form, setForm] = useState({
    pic_name: '',
    pic_position: '',
    ktp_number: '',
    npwp_personal: '',
    npwp_company: ''
  })

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    const loadMerchant = async () => {
      const { data } = await supabase
        .from('merchants')
        .select('pic_name, pic_position, ktp_number, npwp_personal, npwp_company')
        .eq('id', merchantId)
        .maybeSingle()

      if (!data) return

      setForm({
        pic_name: data.pic_name ?? '',
        pic_position: data.pic_position ?? '',
        ktp_number: data.ktp_number ?? '',
        npwp_personal: data.npwp_personal ?? '',
        npwp_company: data.npwp_company ?? '',
      })
    }

    void loadMerchant()
  }, [merchantId, supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleNext = async () => {
    if (!form.pic_name || !form.ktp_number) {
      setErrorMsg('PIC Name & KTP wajib diisi')
      return
    }

    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    const { error } = await supabase
      .from('merchants')
      .update({
        ...form,
        onboarding_step: 3
      })
      .eq('id', merchantId)

    if (error) {
      setErrorMsg(error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setStep(3)
  }

  const handleBack = async () => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    const { error } = await supabase
      .from('merchants')
      .update({
        onboarding_step: 1
      })
      .eq('id', merchantId)

    if (error) {
      setErrorMsg(error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setStep(1)
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    const { error } = await supabase
      .from('merchants')
      .update({
        ...form,
        onboarding_step: 2,
        onboarding_completed: false,
        verification_status: 'draft'
      })
      .eq('id', merchantId)

    if (error) {
      setErrorMsg(error.message)
      setSaving(false)
      return
    }

    setSuccessMsg('Draft step legal identity berhasil disimpan.')
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">PIC Name</span>
          <input
            name="pic_name"
            placeholder="Nama penanggung jawab"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={form.pic_name}
            onChange={handleChange}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">PIC Position</span>
          <input
            name="pic_position"
            placeholder="Founder / Director / Manager"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={form.pic_position}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">KTP Number</span>
          <input
            name="ktp_number"
            placeholder="Nomor KTP penanggung jawab"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={form.ktp_number}
            onChange={handleChange}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">NPWP Personal</span>
          <input
            name="npwp_personal"
            placeholder="Opsional jika tersedia"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={form.npwp_personal}
            onChange={handleChange}
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">NPWP Company</span>
        <input
          name="npwp_company"
          placeholder="Nomor NPWP badan usaha"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
          value={form.npwp_company}
          onChange={handleChange}
        />
      </label>

      <div className="rounded-[24px] border border-orange-100 bg-[#fff9f2] px-5 py-4 text-sm leading-7 text-slate-600">
        Gunakan data identitas yang sama dengan dokumen upload agar admin dapat memverifikasi tanpa revisi tambahan.
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 md:flex-row md:items-center md:justify-between">
        <div>
          {errorMsg ? <p className="text-sm text-red-600">{errorMsg}</p> : null}
          {successMsg ? <p className="text-sm text-emerald-600">{successMsg}</p> : null}
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-white px-6 py-3 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={handleBack}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-white px-6 py-3 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Saving...' : 'Back to Company Profile'}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d86118_0%,#ef7f1a_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(216,97,24,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Saving...' : 'Continue to Banking Details'}
          </button>
        </div>
      </div>
    </div>
  )
}
