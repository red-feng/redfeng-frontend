import FinanceSettingsPage from "@/app/finance/(protected)/settings/page"

export default async function SuperadminFinanceSettingsSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { section } = await params
  return FinanceSettingsPage({ searchParams, portal: "superadmin", section })
}
