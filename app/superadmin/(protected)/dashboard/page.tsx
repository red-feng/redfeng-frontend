import AdminDashboardPage from "@/app/admin/(protected)/dashboard/page"

export default async function SuperadminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string; view?: string }>
}) {
  return AdminDashboardPage({ searchParams, portal: "superadmin" })
}
