import ServiceDummyCatalogPage from "@/app/components/services/ServiceDummyCatalogPage"

export const dynamic = "force-dynamic"

type ActivitiesPageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function ActivitiesPage({ searchParams }: ActivitiesPageProps) {
  return <ServiceDummyCatalogPage slug="aktivitas" searchParams={searchParams} />
}
