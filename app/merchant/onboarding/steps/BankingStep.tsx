'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BankingStep({
  merchantId,
  setStep
}: {
  merchantId: string
  setStep: (step: number) => void
}) {
  const supabase = createClient()

  const [form, setForm] = useState({
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    bank_branch: ''
  })

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    const loadMerchant = async () => {
      const { data } = await supabase
        .from('merchants')
        .select('bank_name, bank_account_number, bank_account_holder, bank_branch')
        .eq('id', merchantId)
        .maybeSingle()

      if (!data) return

      setForm({
        bank_name: data.bank_name ?? '',
        bank_account_number: data.bank_account_number ?? '',
        bank_account_holder: data.bank_account_holder ?? '',
        bank_branch: data.bank_branch ?? '',
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
    if (!form.bank_name || !form.bank_account_number || !form.bank_account_holder) {
      setErrorMsg('Data bank wajib diisi lengkap')
      return
    }

    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    const { error } = await supabase
      .from('merchants')
      .update({
        ...form,
        onboarding_step: 4
      })
      .eq('id', merchantId)

    if (error) {
      setErrorMsg(error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setStep(4)
  }

  const handleBack = async () => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    const { error } = await supabase
      .from('merchants')
      .update({
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

  const handleSaveDraft = async () => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    const { error } = await supabase
      .from('merchants')
      .update({
        ...form,
        onboarding_step: 3,
        onboarding_completed: false,
        verification_status: 'draft'
      })
      .eq('id', merchantId)

    if (error) {
      setErrorMsg(error.message)
      setSaving(false)
      return
    }

    setSuccessMsg('Draft step banking details berhasil disimpan.')
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Bank Name</span>
          <input
            name="bank_name"
            placeholder="BCA / Mandiri / BNI / BRI"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={form.bank_name}
            onChange={handleChange}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Account Holder Name</span>
          <input
            name="bank_account_holder"
            placeholder="Nama pemilik rekening"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={form.bank_account_holder}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-[1.05fr_0.95fr]">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Bank Account Number</span>
          <input
            name="bank_account_number"
            placeholder="Nomor rekening payout"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={form.bank_account_number}
            onChange={handleChange}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Bank Branch</span>
          <input
            name="bank_branch"
            placeholder="Cabang bank (opsional)"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={form.bank_branch}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className="rounded-[24px] border border-orange-100 bg-[#fff9f2] px-5 py-4 text-sm leading-7 text-slate-600">
        Rekening ini akan digunakan untuk payout setelah booking memenuhi syarat pelepasan dana dan merchant lolos verifikasi.
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
            {saving ? 'Saving...' : 'Back to Legal Identity'}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d86118_0%,#ef7f1a_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(216,97,24,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Saving...' : 'Continue to Documents'}
          </button>
        </div>
      </div>
    </div>
  )
}
