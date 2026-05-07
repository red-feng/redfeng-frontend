import ServiceLandingPage from "@/app/components/services/ServiceLandingPage"
import { servicePageConfigByLabel } from "@/app/components/services/serviceCatalog"
import { getCurrentLocale } from "@/lib/locale"

export const dynamic = "force-dynamic"

export default async function ActivitiesPage() {
  const locale = await getCurrentLocale()
  return <ServiceLandingPage locale={locale} service={servicePageConfigByLabel["Aktivitas"]} />
}
