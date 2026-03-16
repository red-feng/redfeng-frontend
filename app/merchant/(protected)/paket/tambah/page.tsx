import { createClient } from "@/lib/supabase/server"
import { getCurrentLocale } from "@/lib/locale"
import Step1Basic from "./Step1Basic"
import Step2Details from "./Step2Details"
import Step3Facilities from "./Step3Facilities"
import Step4Itinerary from "./Step4Itinerary"
import Step5Review from "./Step5Review"

export default async function WizardPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; id?: string; error?: string }>
}) {
  const supabase = await createClient()
  const uiLocale = await getCurrentLocale()
  const resolvedSearchParams = await searchParams

  const { data: countries } = await supabase
    .from("countries")
    .select("id, name")
    .order("name")

  const step = resolvedSearchParams.step ?? "1"
  const packageId = resolvedSearchParams.id ?? null
  const errorMessage = resolvedSearchParams.error ?? null
  let defaultLanguage = "id"
  let publishedLanguages = ["id"]

  if ((step === "2" || step === "3" || step === "4" || step === "5") && packageId) {
    let pkg:
      | {
          default_language: string | null
          published_languages?: string[] | null
        }
      | null = null

    const packageWithPublished = await supabase
      .from("packages")
      .select("default_language, published_languages")
      .eq("id", packageId)
      .maybeSingle()

    if (packageWithPublished.error?.message?.includes("published_languages")) {
      const legacyPackage = await supabase
        .from("packages")
        .select("default_language")
        .eq("id", packageId)
        .maybeSingle()
      pkg = legacyPackage.data
    } else {
      pkg = packageWithPublished.data
    }

    defaultLanguage = pkg?.default_language || "id"
    publishedLanguages = pkg?.published_languages?.length
      ? pkg.published_languages
      : [defaultLanguage]
  }

  return (
    <div>
      {errorMessage && (
        <div className="mx-auto mt-4 max-w-5xl rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {step === "1" && (
        <Step1Basic countries={countries || []} uiLocale={uiLocale} />
      )}
      {step === "2" && (
        <Step2Details
          packageId={packageId}
          defaultLanguage={defaultLanguage}
          publishedLanguages={publishedLanguages}
          uiLocale={uiLocale}
        />
      )}
      {step === "3" && (
        <Step3Facilities packageId={packageId} defaultLanguage={defaultLanguage} uiLocale={uiLocale} />
      )}
      {step === "4" && (
        <Step4Itinerary
          packageId={packageId}
          defaultLanguage={defaultLanguage}
          publishedLanguages={publishedLanguages}
          uiLocale={uiLocale}
        />
      )}
      {step === "5" && (
        <Step5Review packageId={packageId} defaultLanguage={defaultLanguage} uiLocale={uiLocale} />
      )}
    </div>
  )
}
