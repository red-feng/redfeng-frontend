import AdminMerchantPackagesPage from "@/app/admin/(protected)/merchants/[id]/page"

export default async function SuperadminMerchantPackagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ status?: string; q?: string; sort?: string; success?: string; error?: string }>
}) {
  return AdminMerchantPackagesPage({ params, searchParams, portal: "superadmin" })
}
