import Link from "next/link"
import { redirect } from "next/navigation"
import { ADMIN_ACTIVE_BOOKING_BADGE_STATUSES } from "@/lib/nav-badge-policy"
import { getRoleLabel } from "@/lib/internal-roles"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type DashboardSearchParams = {
  success?: string
  error?: string
}

type CountResult = {
  count: number | null
}

type ProfileRow = {
  id: string
  username: string | null
  role: string | null
}

type AccountActivityRow = {
  id: string
  action: string
  summary: string | null
  created_at: string | null
  metadata: {
    scope?: string | null
    username?: string | null
    requestedRole?: string | null
  } | null
}

type ManagerReportRow = {
  id: string
  title: string
  summary: string
  author_role: string | null
  created_at: string | null
}

function formatCompactCount(value: number | null | undefined) {
  const amount = Number(value || 0)
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)} M`
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`
  return amount.toLocaleString("id-ID")
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
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

function getCount(result: PromiseSettledResult<{ count: number | null }>) {
  if (result.status !== "fulfilled") return 0
  return Number(result.value.count || 0)
}

function getRows<T>(result: PromiseSettledResult<{ data: T[] | null }>) {
  if (result.status !== "fulfilled") return [] as T[]
  return result.value.data || []
}

export default async function SuperadminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<DashboardSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const supabase = await createClient("superadmin")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/superadmin/login?error=session-ended")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "superadmin") {
    redirect("/superadmin/login?error=no-profile")
  }

  const adminSupabase = createAdminClient()
  const settled = await Promise.allSettled([
    adminSupabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "operations_manager"),
    adminSupabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
    adminSupabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "finance_manager"),
    adminSupabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "finance"),
    adminSupabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "marketing_manager"),
    adminSupabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "marketing"),
    adminSupabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
    adminSupabase.from("marketing_promos").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("marketing_inspiration_articles").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("bookings").select("id", { count: "exact", head: true }).in("booking_status", ADMIN_ACTIVE_BOOKING_BADGE_STATUSES),
    adminSupabase.from("admin_action_logs").select("id", { count: "exact", head: true }),
    adminSupabase
      .from("profiles")
      .select("id, username, role")
      .in("role", ["operations_manager", "finance_manager", "marketing_manager"])
      .order("username", { ascending: true }),
    adminSupabase
      .from("admin_action_logs")
      .select("id, action, summary, created_at, metadata")
      .eq("target_type", "internal_account")
      .order("created_at", { ascending: false })
      .limit(6),
    adminSupabase
      .from("manager_reports")
      .select("id, title, summary, author_role, created_at")
      .order("created_at", { ascending: false })
      .limit(4),
  ])

  const operationsManagerCount = getCount(settled[0] as PromiseSettledResult<CountResult>)
  const adminCount = getCount(settled[1] as PromiseSettledResult<CountResult>)
  const financeManagerCount = getCount(settled[2] as PromiseSettledResult<CountResult>)
  const financeCount = getCount(settled[3] as PromiseSettledResult<CountResult>)
  const marketingManagerCount = getCount(settled[4] as PromiseSettledResult<CountResult>)
  const marketingCount = getCount(settled[5] as PromiseSettledResult<CountResult>)
  const activeSubscribers = getCount(settled[6] as PromiseSettledResult<CountResult>)
  const activePromos = getCount(settled[7] as PromiseSettledResult<CountResult>)
  const activeArticles = getCount(settled[8] as PromiseSettledResult<CountResult>)
  const financeReadyBookings = getCount(settled[9] as PromiseSettledResult<CountResult>)
  const auditLogCount = getCount(settled[10] as PromiseSettledResult<CountResult>)
  const managerProfiles = getRows(settled[11] as PromiseSettledResult<{ data: ProfileRow[] | null }>)
  const recentAccountActivity = getRows(settled[12] as PromiseSettledResult<{ data: AccountActivityRow[] | null }>)
  const recentManagerReports = getRows(settled[13] as PromiseSettledResult<{ data: ManagerReportRow[] | null }>)

  const domainCards = [
    {
      label: "Operations domain",
      eyebrow: "Operations overview",
      headline: `${formatCompactCount(operationsManagerCount)} manager / ${formatCompactCount(adminCount)} admin`,
      note: "Pantau backlog operasional, ritme SLA, queue lintas kontrol, dan laporan operations manager dari satu halaman domain.",
      metrics: [
        `${formatCompactCount(financeReadyBookings)} finance-ready booking`,
        `${formatCompactCount(operationsManagerCount + adminCount)} anggota tim operasi`,
      ],
      links: [
        { href: "/superadmin/operations-manager", label: "Buka operations overview" },
        { href: "/superadmin/bookings", label: "Lihat booking & transaksi" },
        { href: "/superadmin/team-accounts", label: "Buka ops team accounts" },
      ],
    },
    {
      label: "Finance domain",
      eyebrow: "Finance overview",
      headline: `${formatCompactCount(financeManagerCount)} manager / ${formatCompactCount(financeCount)} finance`,
      note: "Gunakan preview finance untuk membaca queue approval, performa kontrol dana, dan struktur tim keuangan tanpa keluar dari portal superadmin.",
      metrics: [
        `${formatCompactCount(financeManagerCount + financeCount)} anggota tim finance`,
        `${formatCompactCount(auditLogCount)} audit rows tersedia`,
      ],
      links: [
        { href: "/superadmin/finance-manager", label: "Buka finance overview" },
        { href: "/superadmin/finance-team-accounts", label: "Buka finance team accounts" },
        { href: "/superadmin/audit-log", label: "Tinjau audit trail" },
      ],
    },
    {
      label: "Marketing domain",
      eyebrow: "Marketing overview",
      headline: `${formatCompactCount(marketingManagerCount)} manager / ${formatCompactCount(marketingCount)} marketing`,
      note: "Lihat audience, promo, dan blok inspirasi sebagai satu domain campaign agar superadmin bisa memantau kesehatan funnel marketing secara ringkas.",
      metrics: [
        `${formatCompactCount(activeSubscribers)} subscriber aktif`,
        `${formatCompactCount(activePromos)} promo live / ${formatCompactCount(activeArticles)} artikel live`,
      ],
      links: [
        { href: "/superadmin/marketing-manager", label: "Buka marketing overview" },
        { href: "/superadmin/marketing-newsletters", label: "Preview newsletter audience" },
        { href: "/superadmin/marketing-promos", label: "Preview promo content" },
      ],
    },
  ]

  const controlLanes = [
    {
      label: "Struktur organisasi",
      note: "Jalur ini dipakai untuk membentuk owner domain dan menjaga hierarki akun internal tetap rapi.",
      links: [
        { href: "/superadmin/team-accounts", label: "Kelola Operations Team Accounts" },
        { href: "/superadmin/finance-team-accounts", label: "Kelola Finance Team Accounts" },
        { href: "/superadmin/marketing-team-accounts", label: "Kelola Marketing Team Accounts" },
        { href: "/superadmin/superadmin-accounts", label: "Kelola Superadmin Accounts" },
      ],
    },
    {
      label: "Kontrol lintas fungsi",
      note: "Gunakan jalur cepat ini saat perlu meninjau domain operasional, komunikasi internal, atau jejak audit.",
      links: [
        { href: "/superadmin/operations-manager", label: "Buka Operations Overview" },
        { href: "/superadmin/finance-manager", label: "Buka Finance Overview" },
        { href: "/superadmin/marketing-manager", label: "Buka Marketing Overview" },
        { href: "/superadmin/internal-chat", label: "Buka Internal Chat" },
        { href: "/superadmin/audit-log", label: "Buka Audit Trail" },
      ],
    },
  ]

  const governanceCards = [
    {
      label: "Akun level manager",
      value: formatCompactCount(operationsManagerCount + financeManagerCount + marketingManagerCount),
      note: "Total pemilik domain internal yang aktif saat ini.",
    },
    {
      label: "Queue ke finance",
      value: formatCompactCount(financeReadyBookings),
      note: "Booking yang masuk antrian lintas kontrol pada sisi superadmin.",
    },
    {
      label: "Audit rows",
      value: formatCompactCount(auditLogCount),
      note: "Jejak audit internal yang sudah terekam di sistem.",
    },
    {
      label: "Audience marketing",
      value: formatCompactCount(activeSubscribers),
      note: "Subscriber aktif yang saat ini menjadi aset campaign.",
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-violet-200/60 bg-[linear-gradient(135deg,#3b0764_0%,#6d28d9_40%,#8b5cf6_72%,#c4b5fd_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(76,29,149,0.2)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_340px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-violet-50">
                Executive Control Center
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                Superadmin mengawasi struktur tim, domain utama, dan ritme kontrol lintas fungsi.
              </h1>
              <p className="mt-3 text-sm leading-7 text-violet-50/90 sm:mt-4 sm:text-base sm:leading-8">
                Halaman ini sekarang dipisah dari dashboard admin harian agar superadmin bisa fokus pada struktur akun,
                governance, dan kesehatan domain operations, finance, dan marketing.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/superadmin/superadmin-accounts"
                  className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
                >
                  Kelola akun superadmin
                </Link>
                <Link
                  href="/superadmin/audit-log"
                  className="inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Buka audit trail
                </Link>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:rounded-[24px] sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-violet-100/80">Live governance snapshot</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-violet-50/80">Manager aktif</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                    {formatCompactCount(operationsManagerCount + financeManagerCount + marketingManagerCount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-violet-50/80">Finance-ready queue</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{formatCompactCount(financeReadyBookings)}</p>
                </div>
                <div>
                  <p className="text-sm text-violet-50/80">Marketing live assets</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                    {formatCompactCount(activePromos + activeArticles)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{params.success}</div> : null}
        {params.error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{params.error}</div> : null}

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {governanceCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[22px] border border-violet-200/50 bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-600">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{card.value}</p>
              <p className="mt-2 text-xs leading-6 text-slate-500">{card.note}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-3">
          {domainCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[24px] border border-violet-200/50 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-600">{card.eyebrow}</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">{card.headline}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{card.note}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {card.metrics.map((metric) => (
                  <span
                    key={metric}
                    className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700"
                  >
                    {metric}
                  </span>
                ))}
              </div>
              <div className="mt-5 grid gap-2.5">
                {card.links.map((link, index) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={
                      index === 0
                        ? "inline-flex rounded-full border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                        : "inline-flex rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    }
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <article className="rounded-[24px] border border-violet-200/50 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-600">Team structure</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                  Struktur manager aktif
                </h2>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {!managerProfiles.length ? (
                <div className="rounded-[24px] border border-dashed border-violet-200 bg-violet-50/40 px-5 py-6 text-sm text-slate-500">
                  Belum ada manager domain yang tersimpan.
                </div>
              ) : (
                managerProfiles.map((item) => (
                  <div key={item.id} className="rounded-[22px] border border-violet-100 bg-violet-50/30 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{item.username || "(tanpa username)"}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                          {getRoleLabel(item.role)}
                        </p>
                      </div>
                      <span className="inline-flex rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700">
                        Active
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[24px] border border-violet-200/50 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-600">Control actions</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                  Perubahan akun internal terbaru
                </h2>
              </div>
              <Link href="/superadmin/team-accounts" className="text-sm font-semibold text-violet-700">
                Buka struktur tim
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {!recentAccountActivity.length ? (
                <div className="rounded-[24px] border border-dashed border-violet-200 bg-violet-50/40 px-5 py-6 text-sm text-slate-500">
                  Belum ada perubahan akun internal terbaru.
                </div>
              ) : (
                recentAccountActivity.map((item) => (
                  <div key={item.id} className="rounded-[22px] border border-violet-100 bg-violet-50/30 px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-violet-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-700">
                        {titleCase(item.action)}
                      </span>
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                        {titleCase(item.metadata?.scope || "internal")}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-950">{item.summary || "Perubahan akun internal"}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[0.94fr_1.06fr]">
          <article className="rounded-[24px] border border-violet-200/50 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-600">Quick links</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
              Jalur kerja superadmin
            </h2>
            <div className="mt-5 space-y-4">
              {controlLanes.map((lane) => (
                <div key={lane.label} className="rounded-[22px] border border-violet-100 bg-violet-50/20 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">{lane.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{lane.note}</p>
                  <div className="mt-4 grid gap-3">
                    {lane.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="rounded-[18px] border border-violet-100 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-violet-100/40"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[24px] border border-violet-200/50 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-600">Manager reports</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                  Laporan manajerial terbaru
                </h2>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {!recentManagerReports.length ? (
                <div className="rounded-[24px] border border-dashed border-violet-200 bg-violet-50/40 px-5 py-6 text-sm text-slate-500">
                  Belum ada laporan manager yang tercatat.
                </div>
              ) : (
                recentManagerReports.map((item) => (
                  <div key={item.id} className="rounded-[22px] border border-violet-100 bg-violet-50/30 px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-violet-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-700">
                        {titleCase(normalizeText(item.author_role))}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{item.summary}</p>
                    <p className="mt-3 text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}
