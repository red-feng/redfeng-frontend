import ServiceDummyCatalogPage from "@/app/components/services/ServiceDummyCatalogPage"

export const dynamic = "force-dynamic"

type ShipPageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function ShipPage({ searchParams }: ShipPageProps) {
  return <ServiceDummyCatalogPage slug="kapal" searchParams={searchParams} />
}
