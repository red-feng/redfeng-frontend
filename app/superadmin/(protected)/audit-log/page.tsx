import AdminAuditLogPage from "@/app/admin/(protected)/audit-log/page"

export default async function SuperadminAuditLogPage({
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
  return AdminAuditLogPage({ searchParams, portal: "superadmin" })
}
