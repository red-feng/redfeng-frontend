import Link from "next/link"
import { redirect } from "next/navigation"
import { formatAdminCode } from "@/lib/merchant-code"
import { getRoleLabel } from "@/lib/internal-roles"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createAdminAccount, deleteAdminAccount, resetAdminPassword } from "./actions"

type SearchParams = Promise<{ success?: string; error?: string }>
type AdminTeamAccountsPortal = "admin" | "superadmin"

export default async function AdminTeamAccountsPage({
  searchParams,
  portal = "admin",
}: {
  searchParams: SearchParams
  portal?: AdminTeamAccountsPortal
}) {
  const params = await searchParams
  const supabase = await createClient(portal)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const loginPath = portal === "superadmin" ? "/superadmin/login" : "/admin/login"
  const fallbackDashboardPath = portal === "superadmin" ? "/superadmin/dashboard" : "/admin/dashboard"

  if (!user) {
    redirect(loginPath)
  }

  const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  const canAccessPage =
    portal === "superadmin"
      ? currentProfile?.role === "superadmin"
      : ["operations_manager", "superadmin"].includes(currentProfile?.role || "")

  if (!canAccessPage) {
    redirect(fallbackDashboardPath)
  }

  const resolvedRole = currentProfile?.role || ""
  const adminSupabase = createAdminClient()
  const isSuperadmin = resolvedRole === "superadmin"
  const isSuperadminView = portal === "superadmin"
  const basePath = isSuperadmin ? "/superadmin/team-accounts" : "/admin/team-accounts"
  const backHref = isSuperadmin ? "/superadmin/dashboard" : "/admin/dashboard"
  const { data: adminProfiles } = await adminSupabase
    .from("profiles")
    .select("id, username, role")
    .in("role", ["admin", "operations_manager"])
    .order("username", { ascending: true })

  const teamProfiles = (adminProfiles || []).filter((profile) => profile.id !== user.id)
  const operationsManagerCount = teamProfiles.filter((profile) => profile.role === "operations_manager").length + (resolvedRole === "operations_manager" ? 1 : 0)
  const adminCount = teamProfiles.filter((profile) => profile.role === "admin").length + (resolvedRole === "admin" ? 1 : 0)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                {isSuperadminView ? "Operations Structure Control" : "Operations Team Accounts"}
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl lg:text-5xl">
                {isSuperadminView
                  ? "Superadmin menjaga struktur akun operasional dari panel lintas tim."
                  : "Operations manager memegang tim admin, superadmin memegang level manajerialnya."}
              </h1>
              <p className="mt-3 text-sm leading-7 text-orange-50/90 sm:mt-4 sm:text-base sm:leading-8">
                {isSuperadminView
                  ? "Dari portal superadmin, Anda bisa melihat struktur operasional secara utuh, membuat operations manager baru, dan menjaga kepemilikan tim admin tetap jelas."
                  : "Semua akun operasional internal login dengan username dan password. Operations manager membuat akun admin team, sedangkan superadmin dapat membuat operations manager baru bila struktur operasional bertambah."}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:rounded-[24px] sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Account snapshot</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Operations manager</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{operationsManagerCount.toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Admin team</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{adminCount.toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">{isSuperadminView ? "Accounts in directory" : "Other accounts shown"}</p>
                  <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{teamProfiles.length.toLocaleString("id-ID")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{params.success}</div> : null}
        {params.error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{params.error}</div> : null}

        <section className="grid gap-3 sm:gap-4 md:grid-cols-3">
          <article className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Managers</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{operationsManagerCount.toLocaleString("id-ID")}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Pemilik quality control, laporan, dan ritme operasional.</p>
          </article>
          <article className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Executors</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{adminCount.toLocaleString("id-ID")}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Admin harian yang menggerakkan queue merchant, paket, dan booking.</p>
          </article>
          <article className="rounded-[22px] border border-[#f0ddc7] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[26px] sm:px-5 sm:py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Directory view</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">{teamProfiles.length.toLocaleString("id-ID")}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">Akun lain yang tampil selain akun yang sedang dipakai.</p>
          </article>
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4 sm:space-y-6">
            <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Create account</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Buat akun operasional</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                {isSuperadminView
                  ? "Gunakan panel ini untuk membentuk struktur operasional dari level superadmin, termasuk saat Anda perlu menambahkan operations manager baru."
                  : "Gunakan panel ini untuk menambah anggota baru ke workspace operasional tanpa keluar dari alur kerja utama."}
              </p>
              <form action={createAdminAccount} className="mt-6 space-y-4">
                <input type="hidden" name="return_to" value={basePath} />
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Username</label>
                  <input
                    name="username"
                    type="text"
                    required
                    placeholder="mis: admin.operasional"
                    className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Role</label>
                  <select
                    name="role"
                    defaultValue="admin"
                    className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  >
                    <option value="admin">Admin</option>
                    {isSuperadmin ? <option value="operations_manager">Operations Manager</option> : null}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Password awal</label>
                  <input
                    name="password"
                    type="text"
                    required
                    minLength={8}
                    placeholder="Minimal 8 karakter"
                    className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
                </div>
                <button className="rounded-[20px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Buat akun operasional
                </button>
              </form>
              <Link href={backHref} className="mt-5 inline-flex text-sm font-semibold text-orange-600">
                {isSuperadminView ? "Kembali ke superadmin dashboard" : "Kembali ke admin dashboard"}
              </Link>
            </section>
          </div>

          <section className="rounded-[24px] border border-[#f3dbc3] bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[32px] sm:p-6 lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Direktori tim</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Daftar akun operasional</h2>
            <div className="mt-4 rounded-[20px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-800">
              Akun yang sedang Anda pakai tidak ditampilkan di daftar ini. Reset password dan hapus akun sendiri harus dilakukan lewat jalur terpisah agar session operasional aktif tidak terputus tanpa sengaja.
            </div>
            <div className="mt-6 space-y-4">
              {teamProfiles.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                  Belum ada akun operasional tambahan. Operations manager atau superadmin bisa membuat akun pertama dari panel ini.
                </div>
              ) : (
                teamProfiles.map((profile) => (
                  <article key={profile.id} className="rounded-[22px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Username</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-950">{profile.username || "(tanpa username)"}</h3>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">{formatAdminCode(profile.id)}</p>
                        <p className="mt-2 text-xs text-slate-500">{getRoleLabel(profile.role)}</p>
                      </div>
                      <div className="flex flex-col gap-3 md:min-w-[260px]">
                        <form action={resetAdminPassword} className="space-y-3">
                          <input type="hidden" name="adminId" value={profile.id} />
                          <input type="hidden" name="return_to" value={basePath} />
                          <input
                            name="password"
                            type="text"
                            minLength={8}
                            required
                            placeholder="Password baru admin"
                            className="w-full rounded-[16px] border border-[#e6d8c2] bg-white px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                          />
                          <button className="w-full rounded-[16px] border border-orange-200 bg-white px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50">
                            Reset password
                          </button>
                        </form>
                        <form action={deleteAdminAccount}>
                          <input type="hidden" name="adminId" value={profile.id} />
                          <input type="hidden" name="return_to" value={basePath} />
                          <button className="w-full rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                            Hapus akun operasional
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}
