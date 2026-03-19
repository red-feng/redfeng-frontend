"use client"

import Link from "next/link"
import { useState } from "react"
import { dictionaries, type Locale } from "@/lib/i18n"

type ModalType = "equipment" | "terms" | null

export default function SidebarActions({
  packageId,
  preparation,
  termsConditions,
  locale,
}: {
  packageId: string
  preparation: string | null
  termsConditions: string | null
  locale: Locale
}) {
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const tDetail = dictionaries[locale].detail
  const tSidebar = dictionaries[locale].sidebar

  const modalTitle =
    activeModal === "equipment" ? tSidebar.personalDocs : tSidebar.terms
  const modalContent =
    activeModal === "equipment" ? preparation || "-" : termsConditions || "-"
  const softTitle =
    locale === "en" ? "Useful Info" : locale === "zh" ? "实用信息" : "Info Penting"

  return (
    <>
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="rounded-[24px] border border-orange-100 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">{softTitle}</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{tDetail.otherInfo}</h3>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <button
            type="button"
            onClick={() => setActiveModal("equipment")}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/60"
          >
            {tSidebar.personalDocs}
          </button>
          <button
            type="button"
            onClick={() => setActiveModal("terms")}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/60"
          >
            {tSidebar.terms}
          </button>
          <Link
            href={`/chat?package_id=${packageId}`}
            className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/60"
          >
            {tDetail.chat}
          </Link>
        </div>
      </section>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-xl rounded-[28px] bg-white p-5 shadow-2xl md:p-6">
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
            <div className="mt-4 max-h-[55vh] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
              <p className="whitespace-pre-line">{modalContent}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
