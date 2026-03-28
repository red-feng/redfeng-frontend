import AdminDashboardPage from "@/app/admin/(protected)/dashboard/page"

export default async function SuperadminOperationsManagerPreviewPage() {
  return AdminDashboardPage({
    searchParams: Promise.resolve({ view: "operations-manager" }),
  })
}
