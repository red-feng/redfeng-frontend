"use client"

import Link from "next/link"
import { useState } from "react"

type ModalType = "equipment" | "terms" | null

export default function SidebarActions({
  packageId,
  preparation,
  termsConditions,
}: {
  packageId: string
  preparation: string | null
  termsConditions: string | null
}) {
  const [activeModal, setActiveModal] = useState<ModalType>(null)

  const modalTitle =
    activeModal === "equipment" ? "Peralatan & dokumen pribadi" : "Syarat dan ketentuan"
  const modalContent =
    activeModal === "equipment" ? preparation || "-" : termsConditions || "-"

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Informasi Lainnya</h3>
        <div className="mt-3 space-y-2 text-sm">
          <button
            type="button"
            onClick={() => setActiveModal("equipment")}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-slate-700 transition hover:bg-slate-50"
          >
            Peralatan & dokumen pribadi
          </button>
          <button
            type="button"
            onClick={() => setActiveModal("terms")}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-slate-700 transition hover:bg-slate-50"
          >
            Syarat dan ketentuan
          </button>
          <Link
            href={`/chat?package_id=${packageId}`}
            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-slate-700 transition hover:bg-slate-50"
          >
            Chat
          </Link>
        </div>
      </section>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-slate-900">{modalTitle}</h4>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                x
              </button>
            </div>
            <div className="mt-4 max-h-[55vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
              <p className="whitespace-pre-line">{modalContent}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
