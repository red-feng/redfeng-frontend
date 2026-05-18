import ServiceDummyCatalogPage from "@/app/components/services/ServiceDummyCatalogPage"

export const dynamic = "force-dynamic"

type FlightsPageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function FlightsPage({ searchParams }: FlightsPageProps) {
  return <ServiceDummyCatalogPage slug="pesawat" searchParams={searchParams} />
}
