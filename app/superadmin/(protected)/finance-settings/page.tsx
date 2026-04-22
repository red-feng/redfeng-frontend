import FinanceSettingsPage from "@/app/finance/(protected)/settings/page"

export default async function SuperadminFinanceSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  return FinanceSettingsPage({ searchParams, portal: "superadmin" })
}
