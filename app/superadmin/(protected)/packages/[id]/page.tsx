import AdminPackageDetailPage from "@/app/admin/(protected)/packages/[id]/page"

export default async function SuperadminPackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return AdminPackageDetailPage({ params, portal: "superadmin" })
}
