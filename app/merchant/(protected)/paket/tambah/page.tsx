import { createClient } from "@/lib/supabase/server"
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
  const resolvedSearchParams = await searchParams

  const { data: countries } = await supabase
    .from("countries")
    .select("id, name")
    .order("name")

   const step = resolvedSearchParams.step ?? "1"
  const packageId = resolvedSearchParams.id ?? null
  const errorMessage = resolvedSearchParams.error ?? null

  return (
    <div>
      {errorMessage && (
        <div className="mx-auto mt-4 max-w-5xl rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {step === "1" && (
        <Step1Basic countries={countries || []} />
      )}
      {step === "2" && (
        <Step2Details packageId={packageId} />
      )}
      {step === "3" && (
        <Step3Facilities packageId={packageId} />
      )}
      {step === "4" && (
        <Step4Itinerary packageId={packageId} />
      )}
      {step === "5" && (
        <Step5Review packageId={packageId} />
      )}
    </div>
  )
}