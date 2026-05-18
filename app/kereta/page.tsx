import ServiceDummyCatalogPage from "@/app/components/services/ServiceDummyCatalogPage"

export const dynamic = "force-dynamic"

type TrainPageProps = {
  searchParams?: Promise<{ newsletter_success?: string; newsletter_error?: string }>
}

export default async function TrainPage({ searchParams }: TrainPageProps) {
  return <ServiceDummyCatalogPage slug="kereta" searchParams={searchParams} />
}
