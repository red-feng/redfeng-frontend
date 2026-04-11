"use client"

import { useId, useState } from "react"
import ConfirmSubmitButton from "./ConfirmSubmitButton"
import { submitMerchantApprovalRequest, submitMerchantRejectionRequest } from "./actions"

type MerchantReviewRequestActionCardProps = {
  merchantId: string
  variant: "approve" | "reject"
}

const COPY = {
  approve: {
    eyebrow: "Manager Approval",
    title: "Ajukan",
    description: "Setelah review admin selesai, ajukan merchant ini ke operations manager untuk keputusan final approve.",
    noteLabel: "Catatan admin untuk manager",
    placeholder: "Catatan tambahan untuk operations manager, misalnya ringkasan hasil review atau hal penting yang sudah dicek...",
    buttonLabel: "Ajukan",
    modalTitle: "Ajukan merchant untuk approval final",
    modalDescription: "Admin tidak lagi approve langsung. Kirim rekomendasi review ini ke operations manager untuk keputusan final.",
    cardClass: "border-emerald-200 bg-emerald-50/80",
    textareaClass: "border-emerald-200 focus:border-emerald-400 focus:ring-emerald-100",
    buttonClass:
      "bg-emerald-600 shadow-[0_14px_30px_rgba(5,150,105,0.22)] hover:bg-emerald-700",
    submitLabel: "Ajukan",
    pendingLabel: "Mengirim request approval...",
    confirmMessage: "Kirim merchant ini ke operations manager untuk approval final?",
  },
  reject: {
    eyebrow: "Manager Rejection",
    title: "Tolak",
    description: "Gunakan jika menurut admin merchant perlu ditolak. Operations manager tetap memberi keputusan final dan alasan resmi ke merchant.",
    noteLabel: "Catatan admin untuk manager",
    placeholder: "Tuliskan alasan dan konteks review yang perlu dibaca operations manager...",
    buttonLabel: "Tolak",
    modalTitle: "Ajukan merchant untuk keputusan reject final",
    modalDescription: "Operations manager akan memberi keputusan final. Jika ditolak, alasan resminya akan dikirim ke merchant dan admin, lalu merchant mendapat waktu revisi 7 hari.",
    cardClass: "border-rose-200 bg-rose-50/80",
    textareaClass: "border-rose-200 focus:border-rose-400 focus:ring-rose-100",
    buttonClass:
      "bg-rose-600 shadow-[0_14px_30px_rgba(225,29,72,0.22)] hover:bg-rose-700",
    submitLabel: "Ajukan",
    pendingLabel: "Mengirim request rejection...",
    confirmMessage: "Kirim merchant ini ke operations manager untuk diputuskan reject final?",
  },
} as const

export default function MerchantReviewRequestActionCard({
  merchantId,
  variant,
}: MerchantReviewRequestActionCardProps) {
  const [open, setOpen] = useState(false)
  const textareaId = useId()
  const copy = COPY[variant]
  const action = variant === "approve" ? submitMerchantApprovalRequest : submitMerchantRejectionRequest

  return (
    <>
      <div className={`rounded-[24px] border p-5 ${copy.cardClass}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-700">{copy.eyebrow}</p>
        <p className="mt-3 text-sm leading-7 text-slate-700">{copy.description}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`mt-5 inline-flex items-center gap-2 rounded-[18px] px-5 py-3 text-sm font-semibold text-white transition ${copy.buttonClass}`}
        >
          {copy.buttonLabel}
        </button>
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
                  required={variant === "reject"}
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
                  confirmMessage={copy.confirmMessage}
                  pendingLabel={copy.pendingLabel}
                  className={`w-full rounded-[18px] px-5 py-3 text-sm font-semibold text-white transition sm:w-auto ${copy.buttonClass}`}
                >
                  {copy.submitLabel}
                </ConfirmSubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
