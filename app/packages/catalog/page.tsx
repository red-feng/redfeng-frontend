import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function PackagesCatalogRoute({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  await searchParams
  notFound()
}
