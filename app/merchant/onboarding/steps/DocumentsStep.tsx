'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type UploadResult = {
  error: string | null
  url: string | null
}

function UploadField({
  label,
  name,
  required,
  note,
}: {
  label: string
  name: string
  required?: boolean
  note?: string
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {required ? (
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700">
            Required
          </span>
        ) : null}
      </div>
      <input
        type="file"
        name={name}
        required={required}
        className="block w-full rounded-2xl border border-dashed border-slate-300 bg-[#fffdf9] px-4 py-4 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-orange-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
      />
      {note ? <p className="text-xs leading-6 text-slate-500">{note}</p> : null}
    </label>
  )
}

export default function DocumentsStep({ merchantId }: { merchantId: string }) {
  const supabase = createClient()
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleBack = async () => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    const { error } = await supabase
      .from('merchants')
      .update({
        onboarding_step: 3
      })
      .eq('id', merchantId)

    if (error) {
      setErrorMsg(error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    router.refresh()
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    const { error } = await supabase
      .from('merchants')
      .update({
        onboarding_step: 4,
        onboarding_completed: false,
        verification_status: 'draft'
      })
      .eq('id', merchantId)

    if (error) {
      setErrorMsg(error.message)
      setSaving(false)
      return
    }

    setSuccessMsg('Draft step documents upload berhasil disimpan.')
    setSaving(false)
  }

  const uploadFile = async (file: File, folder: string): Promise<UploadResult> => {
    const filePath = `${folder}/${merchantId}-${Date.now()}-${file.name}`

    const { error } = await supabase.storage
      .from('merchant-documents')
      .upload(filePath, file)

    if (error) {
      return { error: error.message, url: null }
    }

    const { data } = supabase.storage
      .from('merchant-documents')
      .getPublicUrl(filePath)

    return { error: null, url: data.publicUrl }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    const form = e.currentTarget
    const ktpFile = form.ktp.files?.[0]
    const npwpFile = form.npwp.files?.[0]
    const nibFile = form.nib.files?.[0]
    const logoFile = form.logo.files?.[0]

    if (!ktpFile || !npwpFile || !nibFile) {
      setErrorMsg('KTP, NPWP Badan Usaha, dan NIB wajib diupload.')
      setSaving(false)
      return
    }

    const ktpUpload = await uploadFile(ktpFile, 'ktp')
    const npwpUpload = await uploadFile(npwpFile, 'npwp')
    const nibUpload = await uploadFile(nibFile, 'nib')
    const logoUpload = logoFile ? await uploadFile(logoFile, 'logo') : { error: null, url: null }

    const uploadError =
      ktpUpload.error || npwpUpload.error || nibUpload.error || logoUpload.error

    if (uploadError) {
      setErrorMsg(uploadError)
      setSaving(false)
      return
    }

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      setErrorMsg('Sesi merchant tidak ditemukan. Silakan login ulang.')
      setSaving(false)
      return
    }

    const { data: merchant, error: merchantFetchError } = await supabase
      .from('merchants')
      .select('brand_name, email')
      .eq('id', merchantId)
      .single()

    if (merchantFetchError) {
      setErrorMsg(merchantFetchError.message)
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('merchants')
      .update({
        email: merchant?.email || user.email || null,
        ktp_file_url: ktpUpload.url,
        npwp_file_url: npwpUpload.url,
        nib_file_url: nibUpload.url,
        logo_url: logoUpload.url,
        onboarding_completed: true,
        verification_status: 'pending'
      })
      .eq('id', merchantId)

    if (updateError) {
      setErrorMsg(updateError.message)
      setSaving(false)
      return
    }

    if (user.email) {
      const response = await fetch('/api/send-merchant-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          brandName: merchant?.brand_name || user.email
        })
      })

      if (!response.ok) {
        setErrorMsg('Data tersimpan, tetapi email notifikasi gagal dikirim.')
      }
    }

    router.replace('/merchant/pending')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5">
        <UploadField
          label="KTP"
          name="ktp"
          required
          note="Upload identitas penanggung jawab yang masih berlaku."
        />
        <UploadField
          label="NPWP Badan Usaha"
          name="npwp"
          required
          note="Gunakan dokumen pajak yang sesuai dengan identitas atau badan usaha."
        />
        <UploadField
          label="NIB"
          name="nib"
          required
          note="Dokumen ini dipakai admin untuk validasi legalitas merchant."
        />
        <UploadField
          label="Logo Brand"
          name="logo"
          note="Opsional, tetapi disarankan agar identitas merchant tampil lebih profesional."
        />
      </div>

      <div className="rounded-[24px] border border-orange-100 bg-[#fff9f2] px-5 py-4 text-sm leading-7 text-slate-600">
        Setelah dokumen lengkap, status merchant akan berubah ke <span className="font-semibold text-slate-950">pending review</span> dan tim admin dapat langsung memeriksa pengajuan Anda.
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
            {saving ? 'Saving...' : 'Back to Banking Details'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d86118_0%,#ef7f1a_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(216,97,24,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Uploading...' : 'Submit for Admin Review'}
          </button>
        </div>
      </div>
    </form>
  )
}
