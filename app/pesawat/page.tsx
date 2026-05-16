import FlightLandingPage from "@/app/components/services/FlightLandingPage"
import { getCurrentLocale } from "@/lib/locale"

export const dynamic = "force-dynamic"

export default async function FlightsPage() {
  const locale = await getCurrentLocale()
  return <FlightLandingPage locale={locale} />
}
