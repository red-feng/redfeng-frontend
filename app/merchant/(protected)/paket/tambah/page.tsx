import Step1Basic from "./Step1Basic"
import Step2Details from "./Step2Details"
import Step3Facilities from "./Step3Facilities"
import Step4Addons from "./Step4Addons"
import Step5Review from "./Step5Review"

export default function WizardPage({
  searchParams,
}: {
  searchParams: { step?: string; id?: string }
}) {
  const step = searchParams.step || "1"
  const packageId = searchParams.id || null

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">Buat Paket Baru</h1>

      {step === "1" && <Step1Basic />}
      {step === "2" && <Step2Details packageId={packageId} />}
      {step === "3" && <Step3Facilities packageId={packageId} />}
      {step === "4" && <Step4Addons packageId={packageId} />}
      {step === "5" && <Step5Review packageId={packageId} />}
    </div>
  )
}