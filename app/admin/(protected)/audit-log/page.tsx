import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"

type AdminActionLogRow = {
  id: string
  actor_id: string | null
  actor_role: string | null
  target_type: "merchant" | "package" | "booking"
  target_id: string
  action: string
  summary: string
  metadata: Record<string, unknown> | null
  created_at: string | null
}

type FilterTarget = "all" | "merchant" | "package" | "booking"
type FilterAction = "all" | "approve" | "reject" | "deactivate" | "reactivate" | "delete" | "handoff_to_finance"
type SearchParams = {
  target?: string
  action?: string
  q?: string
  from?: string
  to?: string
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function titleCase(value: string | null | undefined) {
  const normalized = String(value || "").trim()
  if (!normalized) return "-"
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function normalizeTargetFilter(value: string | undefined): FilterTarget {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "merchant" || normalized === "package" || normalized === "booking") {
    return normalized
  }
  return "all"
}

function normalizeActionFilter(value: string | undefined): FilterAction {
  const normalized = String(value || "").trim().toLowerCase()
  if (
    normalized === "approve" ||
    normalized === "reject" ||
    normalized === "deactivate" ||
    normalized === "reactivate" ||
    normalized === "delete" ||
    normalized === "handoff_to_finance"
  ) {
    return normalized
  }
  return "all"
}

function normalizeDateInput(value: string | undefined) {
  const normalized = String(value || "").trim()
  if (!normalized) return ""
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return ""
  return normalized
}

function buildDateRange(from: string, to: string) {
  const fromValue = from ? new Date(`${from}T00:00:00.000Z`).toISOString() : ""
  const toValue = to ? new Date(`${to}T23:59:59.999Z`).toISOString() : ""
  return { fromValue, toValue }
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined) return "-"
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return JSON.stringify(value)
}

function buildHref(target: FilterTarget, action: FilterAction, q: string, from: string, to: string) {
  const params = new URLSearchParams()
  if (target !== "all") params.set("target", target)
  if (action !== "all") params.set("action", action)
  if (q) params.set("q", q)
  if (from) params.set("from", from)
  if (to) params.set("to", to)
  const query = params.toString()
  return query ? `/admin/audit-log?${query}` : "/admin/audit-log"
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) || {}
  const activeTarget = normalizeTargetFilter(params.target)
  const activeAction = normalizeActionFilter(params.action)
  const searchQuery = String(params.q || "").trim()
  const dateFrom = normalizeDateInput(params.from)
  const dateTo = normalizeDateInput(params.to)
  const { fromValue, toValue } = buildDateRange(dateFrom, dateTo)
  const adminSupabase = createAdminClient()

  let actorIdsFromSearch: string[] = []
  if (searchQuery) {
    const { data: actorProfilesBySearch } = await adminSupabase
      .from("profiles")
      .select("id")
      .ilike("username", `%${searchQuery}%`)
      .limit(25)
    actorIdsFromSearch = ((actorProfilesBySearch as Array<{ id: string }> | null) || []).map((item) => item.id)
  }

  let logsQuery = adminSupabase
    .from("admin_action_logs")
    .select("id, actor_id, actor_role, target_type, target_id, action, summary, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(80)

  if (activeTarget !== "all") {
    logsQuery = logsQuery.eq("target_type", activeTarget)
  }

  if (activeAction !== "all") {
    logsQuery = logsQuery.eq("action", activeAction)
  }

  if (fromValue) {
    logsQuery = logsQuery.gte("created_at", fromValue)
  }

  if (toValue) {
    logsQuery = logsQuery.lte("created_at", toValue)
  }

  if (searchQuery) {
    const escapedQuery = searchQuery.replace(/,/g, " ")
    const actorFilter = actorIdsFromSearch.length ? `,actor_id.in.(${actorIdsFromSearch.join(",")})` : ""
    logsQuery = logsQuery.or(
      `summary.ilike.%${escapedQuery}%,target_id.ilike.%${escapedQuery}%,actor_id.ilike.%${escapedQuery}%${actorFilter}`,
    )
  }

  const { data: actionLogs } = await logsQuery
  const recentLogs = (actionLogs as AdminActionLogRow[] | null) || []
  const actorIds = [...new Set(recentLogs.map((log) => log.actor_id).filter(Boolean))] as string[]
  const { data: actorProfiles } = actorIds.length
    ? await adminSupabase.from("profiles").select("id, username, role").in("id", actorIds)
    : { data: [] as Array<{ id: string; username: string | null; role: string | null }> }

  const actorMap = new Map(
    (((actorProfiles as Array<{ id: string; username: string | null; role: string | null }> | null) || [])).map((profile) => [
      profile.id,
      {
        username: profile.username || profile.id,
        role: profile.role || "-",
      },
    ]),
  )

  const targetFilters: Array<{ value: FilterTarget; label: string }> = [
    { value: "all", label: "Semua Target" },
    { value: "merchant", label: "Merchant" },
    { value: "package", label: "Package" },
    { value: "booking", label: "Booking" },
  ]
  const actionFilters: Array<{ value: FilterAction; label: string }> = [
    { value: "all", label: "Semua Action" },
    { value: "approve", label: "Approve" },
    { value: "reject", label: "Reject" },
    { value: "deactivate", label: "Deactivate" },
    { value: "reactivate", label: "Reactivate" },
    { value: "delete", label: "Delete" },
    { value: "handoff_to_finance", label: "Handoff to Finance" },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)]">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            Audit Log
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Jejak keputusan admin untuk merchant, package, dan booking.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-orange-50/90">
            Halaman ini membantu admin dan superadmin melihat histori keputusan terbaru berdasarkan actor, target, dan jenis aksi yang benar-benar tercatat dari server action admin.
          </p>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Filters</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Saring log audit</h2>

            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-800">Target</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {targetFilters.map((filter) => {
                  const isActive = activeTarget === filter.value
                  return (
                    <Link
                      key={filter.value}
                      href={buildHref(filter.value, activeAction, searchQuery, dateFrom, dateTo)}
                      className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "border-orange-200 bg-[#fff7ef] text-orange-600"
                          : "border-[#ecd9c2] bg-white text-slate-700 hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                      }`}
                    >
                      {filter.label}
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-800">Action</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {actionFilters.map((filter) => {
                  const isActive = activeAction === filter.value
                  return (
                    <Link
                      key={filter.value}
                      href={buildHref(activeTarget, filter.value, searchQuery, dateFrom, dateTo)}
                      className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "border-orange-200 bg-[#fff7ef] text-orange-600"
                          : "border-[#ecd9c2] bg-white text-slate-700 hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                      }`}
                    >
                      {filter.label}
                    </Link>
                  )
                })}
              </div>
            </div>

            <form className="mt-6 grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="target" value={activeTarget === "all" ? "" : activeTarget} />
              <input type="hidden" name="action" value={activeAction === "all" ? "" : activeAction} />
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-slate-800">Cari actor, target ID, atau ringkasan</label>
                <input
                  type="text"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Username actor, booking ID, package ID, merchant ID, atau ringkasan aksi"
                  className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-800">Dari tanggal</label>
                <input
                  type="date"
                  name="from"
                  defaultValue={dateFrom}
                  className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-800">Sampai tanggal</label>
                <input
                  type="date"
                  name="to"
                  defaultValue={dateTo}
                  className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-3">
                <button className="inline-flex items-center justify-center rounded-[18px] bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(249,115,22,0.22)] transition hover:bg-orange-600">
                  Terapkan filter
                </button>
                <Link
                  href="/admin/audit-log"
                  className="inline-flex items-center justify-center rounded-[18px] border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  Reset
                </Link>
              </div>
            </form>
          </div>

          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Unified admin logs</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Jejak actor admin terbaru</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Gunakan pencarian, filter target, action, dan tanggal untuk menelusuri keputusan yang relevan tanpa membuka tiap modul satu per satu.
            </p>
            <div className="mt-5 space-y-3">
              {recentLogs.length === 0 ? (
                <div className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5 text-sm text-slate-600">
                  Belum ada admin action log yang cocok dengan filter ini. Jalankan migration baru lalu lakukan aksi admin untuk mulai mengisi panel ini.
                </div>
              ) : (
                recentLogs.map((log) => {
                  const actor = log.actor_id ? actorMap.get(log.actor_id) : null

                  return (
                    <div key={log.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-orange-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                          {titleCase(log.target_type)}
                        </span>
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                          {titleCase(log.action)}
                        </span>
                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                          {titleCase(actor?.role || log.actor_role)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{log.summary}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Actor: {actor?.username || log.actor_id || "-"} | Target: {log.target_id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
                      {log.metadata && Object.keys(log.metadata).length ? (
                        <details className="mt-3 rounded-[18px] border border-[#efe1cf] bg-white px-4 py-3">
                          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                            Metadata detail
                          </summary>
                          <div className="mt-3 grid gap-2">
                            {Object.entries(log.metadata).map(([key, value]) => (
                              <div key={key} className="rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{titleCase(key)}</p>
                                <p className="mt-1 break-all text-sm text-slate-700">{formatMetadataValue(value)}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
