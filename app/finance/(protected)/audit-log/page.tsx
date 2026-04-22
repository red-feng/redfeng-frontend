import AdminAuditLogPage from "@/app/admin/(protected)/audit-log/page"

export default async function FinanceAuditLogPage({
  searchParams,
}: {
  searchParams?: Promise<{
    target?: string
    action?: string
    q?: string
    from?: string
    to?: string
  }>
}) {
  return AdminAuditLogPage({ searchParams, portal: "finance" })
}
