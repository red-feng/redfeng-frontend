"use client"

import { useId, useState } from "react"
import ConfirmSubmitButton from "./ConfirmSubmitButton"
import { deactivateMerchant, requestMerchantDeletion } from "./actions"

type MerchantReasonActionCardProps = {
  merchantId: string
  variant: "deactivate" | "delete"
}

const COPY = {
  deactivate: {
    eyebrow: "Temporary Block",
    title: "Nonaktif sementara",
    description: "Gunakan jika merchant perlu dihentikan sementara tanpa menghapus histori operasional.",
    noteLabel: "Admin note + email to merchant",
    placeholder: "Alasan nonaktif sementara. Jika diisi, isi ini juga dikirim ke email merchant...",
    buttonLabel: "Nonaktifkan merchant",
    modalTitle: "Nonaktifkan merchant sementara",
    modalDescription: "Tambahkan catatan untuk internal dan notifikasi merchant. Jika diisi, alasan ini juga dikirim ke email merchant.",
    cardClass: "border-[#f2dcc1] bg-[#fffdfa] shadow-[0_14px_36px_rgba(15,23,42,0.06)]",
    headerClass: "border-[#f3e4d2] text-amber-700",
    panelClass: "border-[#f3e4d2]",
    textareaClass: "border-amber-200 focus:border-amber-400 focus:ring-amber-100",
    buttonClass:
      "bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_100%)] shadow-[0_14px_30px_rgba(245,158,11,0.24)] hover:brightness-105",
  },
  delete: {
    eyebrow: "Deletion Request",
    title: "Ajukan hapus merchant",
    description: "Gunakan jika merchant perlu diajukan untuk dihapus permanen. Penghapusan baru dijalankan setelah disetujui operations manager.",
    noteLabel: "Reason for operations manager",
    placeholder: "Alasan pengajuan hapus merchant. Isi ini akan dibaca operations manager saat mereview...",
    buttonLabel: "Ajukan hapus merchant",
    modalTitle: "Ajukan penghapusan merchant",
    modalDescription: "Isi alasan penghapusan lalu kirim pengajuan ke operations manager. Merchant baru akan dihapus permanen setelah disetujui.",
    cardClass: "border-[#f2dcc1] bg-[#fffdfa] shadow-[0_14px_36px_rgba(15,23,42,0.06)]",
    headerClass: "border-[#f3e4d2] text-rose-700",
    panelClass: "border-[#f3e4d2]",
    textareaClass: "border-rose-200 focus:border-rose-400 focus:ring-rose-100",
    buttonClass:
      "bg-[linear-gradient(135deg,#e11d48_0%,#dc2626_100%)] shadow-[0_14px_30px_rgba(225,29,72,0.24)] hover:brightness-105",
  },
} as const

export default function MerchantReasonActionCard({ merchantId, variant }: MerchantReasonActionCardProps) {
  const [open, setOpen] = useState(false)
  const textareaId = useId()
  const copy = COPY[variant]
  const action = variant === "deactivate" ? deactivateMerchant : requestMerchantDeletion
  const submitLabel = variant === "deactivate" ? "Lanjutkan nonaktifkan" : "Kirim pengajuan hapus"
  const confirmMessage =
    variant === "deactivate"
      ? "Yakin ingin menonaktifkan merchant ini? Merchant tidak akan bisa mengakses dashboard sampai diaktifkan kembali."
      : "Yakin ingin mengajukan penghapusan merchant ini? Operations manager akan meninjau sebelum merchant dihapus permanen."

  return (
    <>
      <div className={`flex h-full flex-col overflow-hidden rounded-[20px] border sm:rounded-[24px] ${copy.cardClass}`}>
        <div className={`border-b px-4 py-4 sm:px-5 ${copy.headerClass}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em]">{copy.eyebrow}</p>
        </div>
        <div className="flex h-full flex-col px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-[18px] px-5 py-3 text-sm font-semibold text-white transition sm:w-auto ${copy.buttonClass}`}
          >
            {copy.buttonLabel}
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-4 backdrop-blur-sm sm:py-6">
          <div className="w-full max-w-xl rounded-[24px] border border-[#ecd9c2] bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.2)] sm:rounded-[32px] sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-500">{copy.eyebrow}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">{copy.modalTitle}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:leading-7">{copy.modalDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-[16px] border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 sm:w-auto sm:rounded-full sm:px-3 sm:py-2"
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
                  className={`mt-3 min-h-[120px] w-full rounded-[18px] border bg-[#fffdfa] px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 sm:min-h-[136px] sm:rounded-[20px] ${copy.textareaClass}`}
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-[18px] border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 sm:w-auto"
                >
                  Batal
                </button>
                <ConfirmSubmitButton
                  confirmMessage={confirmMessage}
                  pendingLabel={variant === "deactivate" ? "Sedang menonaktifkan..." : "Mengirim pengajuan..."}
                  className={`w-full rounded-[18px] px-5 py-3 text-sm font-semibold text-white transition sm:w-auto ${copy.buttonClass}`}
                >
                  {submitLabel}
                </ConfirmSubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
