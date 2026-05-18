import ServiceDummyCatalogPage from "@/app/components/services/ServiceDummyCatalogPage"

export const dynamic = "force-dynamic"

type CruisePageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function CruisePage({ searchParams }: CruisePageProps) {
  return <ServiceDummyCatalogPage slug="kapal-pesiar" searchParams={searchParams} />
}
