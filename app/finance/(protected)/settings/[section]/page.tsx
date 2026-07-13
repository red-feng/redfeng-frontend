import FinanceSettingsPage from "../page"

export default async function FinanceSettingsSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { section } = await params
  return FinanceSettingsPage({ searchParams, section })
}
