import ServiceDummyCatalogPage from "@/app/components/services/ServiceDummyCatalogPage"

export const dynamic = "force-dynamic"

type HotelPageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function HotelPage({ searchParams }: HotelPageProps) {
  return <ServiceDummyCatalogPage slug="hotel" searchParams={searchParams} />
}
