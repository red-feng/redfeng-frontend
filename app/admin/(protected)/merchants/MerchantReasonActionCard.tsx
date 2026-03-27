"use client"

import { useId, useState } from "react"
import { deactivateMerchant, deleteMerchant } from "./actions"

type MerchantReasonActionCardProps = {
  merchantId: string
  variant: "deactivate" | "delete"
}

const COPY = {
  deactivate: {
    eyebrow: "Temporary Block",
    title: "Nonaktif sementara",
    description: "Gunakan jika merchant perlu dihentikan sementara tanpa menghapus histori operasional.",
    noteLabel: "Admin note",
    placeholder: "Alasan nonaktif sementara, opsional...",
    buttonLabel: "Nonaktifkan merchant",
    modalTitle: "Nonaktifkan merchant sementara",
    modalDescription: "Tambahkan alasan internal jika perlu, lalu lanjutkan pemblokiran akses merchant.",
    cardClass:
      "border-amber-200/70 bg-[linear-gradient(180deg,#fff9ef_0%,#fff4d8_100%)] shadow-[0_18px_50px_rgba(245,158,11,0.12)]",
    headerClass: "border-amber-200/70 text-amber-700",
    panelClass: "border-amber-200/80",
    textareaClass: "border-amber-200 focus:border-amber-400 focus:ring-amber-100",
    buttonClass:
      "bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_100%)] shadow-[0_14px_30px_rgba(245,158,11,0.24)] hover:brightness-105",
  },
  delete: {
    eyebrow: "Access Removal",
    title: "Hapus merchant",
    description: "Gunakan hanya jika merchant harus dicabut permanen dari akses sistem tanpa menghapus histori transaksi.",
    noteLabel: "Deletion reason",
    placeholder: "Alasan penghapusan merchant...",
    buttonLabel: "Hapus akses merchant",
    modalTitle: "Hapus akses merchant",
    modalDescription: "Isi alasan penghapusan lalu lanjutkan soft delete merchant ini dari akses sistem.",
    cardClass:
      "border-rose-200/70 bg-[linear-gradient(180deg,#fff7f7_0%,#ffe8e8_100%)] shadow-[0_18px_50px_rgba(225,29,72,0.12)]",
    headerClass: "border-rose-200/70 text-rose-700",
    panelClass: "border-rose-200/80",
    textareaClass: "border-rose-200 focus:border-rose-400 focus:ring-rose-100",
    buttonClass:
      "bg-[linear-gradient(135deg,#e11d48_0%,#dc2626_100%)] shadow-[0_14px_30px_rgba(225,29,72,0.24)] hover:brightness-105",
  },
} as const

export default function MerchantReasonActionCard({ merchantId, variant }: MerchantReasonActionCardProps) {
  const [open, setOpen] = useState(false)
  const textareaId = useId()
  const copy = COPY[variant]
  const action = variant === "deactivate" ? deactivateMerchant : deleteMerchant
  const submitLabel = variant === "deactivate" ? "Lanjutkan nonaktifkan" : "Lanjutkan hapus akses"

  return (
    <>
      <div className={`flex h-full flex-col overflow-hidden rounded-[28px] border ${copy.cardClass}`}>
        <div className={`border-b px-5 py-4 ${copy.headerClass}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em]">{copy.eyebrow}</p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">{copy.title}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">{copy.description}</p>
        </div>
        <div className="flex h-full flex-col px-5 pb-5 pt-4">
          <div className={`rounded-[22px] border bg-white/90 p-4 ${copy.panelClass}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{copy.noteLabel}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Klik tombol di bawah untuk membuka pop-up alasan sebelum action dijalankan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`mt-4 inline-flex items-center justify-center gap-2 rounded-[18px] px-5 py-3 text-sm font-semibold text-white transition ${copy.buttonClass}`}
          >
            {copy.buttonLabel}
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[32px] border border-[#ecd9c2] bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.2)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-500">{copy.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{copy.modalTitle}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{copy.modalDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                Tutup
              </button>
            </div>

            <form action={action} className="mt-6 space-y-4">
              <input type="hidden" name="merchantId" value={merchantId} />
              <div>
                <label htmlFor={textareaId} className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {copy.noteLabel}
                </label>
                <textarea
                  id={textareaId}
                  name="reason"
                  placeholder={copy.placeholder}
                  required={variant === "delete"}
                  className={`mt-3 min-h-[136px] w-full rounded-[20px] border bg-[#fffdfa] px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${copy.textareaClass}`}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-[18px] border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`rounded-[18px] px-5 py-3 text-sm font-semibold text-white transition ${copy.buttonClass}`}
                >
                  {submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
