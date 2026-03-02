import Step1Basic from "./Step1Basic"
import Step2Details from "./Step2Details"
import Step3Facilities from "./Step3Facilities"
import Step4Itinerary from "./Step4Itinerary"
import Step5Review from "./Step5Review"

export default async function WizardPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {

  const step =
    typeof searchParams?.step === "string"
      ? searchParams.step
      : "1"

  const packageId =
    typeof searchParams?.id === "string"
      ? searchParams.id
      : undefined

  return (
    <div>
      {step === "1" && <Step1Basic />}
      {step === "2" && <Step2Details packageId={packageId ?? null} />}
      {step === "3" && <Step3Facilities packageId={packageId ?? null} />}
      {step === "4" && <Step4Itinerary packageId={packageId ?? null} />}
      {step === "5" && <Step5Review packageId={packageId ?? null} />}
    </div>
  )
}