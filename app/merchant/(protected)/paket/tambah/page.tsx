"use client"

import { useSearchParams } from "next/navigation"
import Step1Basic from "./Step1Basic"
import Step2Details from "./Step2Details"
import Step3Facilities from "./Step3Facilities"
import Step4Itinerary from "./Step4Itinerary"
import Step5Review from "./Step5Review"

export default function WizardPage() {
  const searchParams = useSearchParams()
  const step = searchParams.get("step") || "1"
  const packageId = searchParams.get("id")

  return (
    <div>
      {step === "1" && <Step1Basic />}
      {step === "2" && <Step2Details packageId={packageId} />}
      {step === "3" && <Step3Facilities packageId={packageId} />}
      {step === "4" && <Step4Itinerary packageId={packageId} />}
      {step === "5" && <Step5Review packageId={packageId} />}
    </div>
  )
}