import FlightCatalogPage from "@/app/components/services/FlightCatalogPage"

export const dynamic = "force-dynamic"

export default async function FlightsCatalogRoute({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  return <FlightCatalogPage searchParams={searchParams} />
}
