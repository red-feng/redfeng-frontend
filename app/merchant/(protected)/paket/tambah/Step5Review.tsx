
import { submitForReview } from "./actions"
import Image from "next/image"
import { getMerchantWizardText } from "@/lib/merchant-wizard-i18n"
import { normalizeLocale } from "@/lib/i18n"

export default function Step5Review({
  packageId,
  defaultLanguage: _defaultLanguage = "id",
  uiLocale = "id",
}: {
  packageId: string | null
  defaultLanguage?: string
  uiLocale?: string
}) {
  void _defaultLanguage
  const t = getMerchantWizardText(normalizeLocale(uiLocale))

  if (!packageId) {
    return <p className="text-red-500">{t.packageIdMissing}</p>
  }

  return (
    <div className="relative min-h-screen">

      {/* BACKGROUND IMAGE */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/bg-wizard.png')"
        }}
      />

     
      {/* CONTENT */}
      <div className="relative z-10">

      {/* HEADER LOGO */}
      <div className="px-10 py-8">
        <Image
          src="/logo-redfeng.png"
          alt="Red Feng"
          width={0}
          height={0}
          sizes="100vw"
          className="h-32 w-auto"
          priority
        />
      </div>

      {/* CONTENT WRAPPER */}
      <div className="flex justify-center px-8 pb-28">

         <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-14">

          <h1 className="text-2xl font-bold mb-2">
            {t.createPackageTitle}
          </h1>

          <p className="text-gray-500 mb-10">
            {t.reviewStep}
          </p>

          <form action={submitForReview} className="space-y-10">

            <input type="hidden" name="package_id" value={packageId} />

            {/* INFO BOX */}
            <div className="bg-orange-50 border border-orange-300 p-6 rounded-2xl space-y-2">
              <p className="text-gray-800 font-medium">
                {t.reviewSubmitInfoTitle}
              </p>
              <p className="text-gray-700 text-sm">
                {t.reviewSubmitInfoBody}
              </p>
            </div>

            {/* CONFIRMATION BOX (visual only) */}
            <div className="bg-slate-50 border rounded-2xl p-6">
              <p className="text-gray-600 text-sm">
                {t.reviewPendingNotice}
              </p>
            </div>

            {/* BUTTON */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                className="px-16 py-4 rounded-2xl font-semibold text-lg
                           bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300
                           text-white
                           shadow-[0_10px_30px_rgba(249,115,22,0.45)]
                           hover:scale-105
                           transition-all duration-300"
              >
                {t.reviewSubmitButton}
              </button>
            </div>

          </form>

        </div>
        </div>
      </div>
    </div>
  )
}
