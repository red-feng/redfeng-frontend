import PackagesCatalogPage from "@/app/components/packages/PackagesCatalogPage"

export const dynamic = "force-dynamic"

export default async function PackagesCatalogRoute({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  return <PackagesCatalogPage searchParams={searchParams} />
}
