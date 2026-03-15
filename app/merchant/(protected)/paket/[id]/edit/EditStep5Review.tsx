"use client"

import { submitEditedPackageForReview } from "../../actions"
import { getMerchantWizardText } from "@/lib/merchant-wizard-i18n"
import { normalizeLocale } from "@/lib/i18n"

export default function EditStep5Review({
  packageId,
  defaultLanguage: _defaultLanguage = "id",
  uiLocale = "id",
}: {
  packageId: string
  defaultLanguage?: string
  uiLocale?: string
}) {
  void _defaultLanguage
  const t = getMerchantWizardText(normalizeLocale(uiLocale))

  return (
    <form action={submitEditedPackageForReview} className="space-y-8">
      <input type="hidden" name="package_id" value={packageId} />

      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
        <p className="font-medium text-slate-900">{t.reviewSubmitInfoTitle}</p>
        <p className="mt-2 text-sm text-slate-600">{t.reviewSubmitInfoBody}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <p className="text-sm text-slate-600">{t.reviewPendingNotice}</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <a
          href="?step=4"
          className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
        >
          {t.back}
        </a>
        <button
          type="submit"
          className="rounded-2xl bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 px-8 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(249,115,22,0.4)] transition-all duration-300 hover:scale-105"
        >
          {t.reviewSubmitButton}
        </button>
      </div>
    </form>
  )
}
