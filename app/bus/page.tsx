import ServiceDummyCatalogPage from "@/app/components/services/ServiceDummyCatalogPage"

export const dynamic = "force-dynamic"

type BusPageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function BusPage({ searchParams }: BusPageProps) {
  return <ServiceDummyCatalogPage slug="bus" searchParams={searchParams} />
}
