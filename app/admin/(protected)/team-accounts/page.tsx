import Link from "next/link"
import { redirect } from "next/navigation"
import { formatAdminCode } from "@/lib/merchant-code"
import { getRoleLabel } from "@/lib/internal-roles"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  createAdminAccount,
  deleteAdminAccount,
  resetAdminPassword,
} from "./actions"

type SearchParams = Promise<{ success?: string; error?: string }>

export default async function AdminTeamAccountsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = await createClient("admin")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!currentProfile || !["operations_manager", "superadmin"].includes(currentProfile.role || "")) {
    redirect("/admin/dashboard")
  }

  const adminSupabase = createAdminClient()
  const isSuperadmin = currentProfile.role === "superadmin"
  const basePath = isSuperadmin ? "/superadmin/team-accounts" : "/admin/team-accounts"
  const backHref = isSuperadmin ? "/superadmin/dashboard" : "/admin/dashboard"
  const { data: adminProfiles } = await adminSupabase
    .from("profiles")
    .select("id, username, role")
    .in("role", ["admin", "operations_manager"])
    .order("username", { ascending: true })

  const teamProfiles = (adminProfiles || []).filter((profile) => profile.id !== user.id)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)]">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            Operations Team Accounts
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Operations manager memegang akun team admin, superadmin memegang level manajerialnya.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-orange-50/90">
            Semua akun operasional internal login dengan username dan password. Operations manager membuat akun admin
            team, sedangkan superadmin dapat membuat operations manager baru bila struktur operasional bertambah.
          </p>
        </section>

        {params.success ? (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {params.success}
          </div>
        ) : null}

        {params.error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {params.error}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-6">
            <form
              action={createAdminAccount}
              className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
            >
              <input type="hidden" name="return_to" value={basePath} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Akun baru</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                Buat akun operasional
              </h2>
              <div className="mt-6 space-y-4">
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
                  Buat
                </button>
              </div>
            </form>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Alur peran</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>1. Operations manager memimpin admin team dan menyusun laporan operasional untuk superadmin.</p>
                <p>2. Superadmin membaca laporan tersebut sebagai ringkasan resmi kinerja merchant, package, dan booking.</p>
                <p>3. Admin team tetap fokus eksekusi harian, sementara operations manager fokus quality control dan pelaporan.</p>
              </div>
              <Link href={backHref} className="mt-5 inline-flex text-sm font-semibold text-orange-600">
                Kembali ke admin dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Direktori tim</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Daftar akun operasional</h2>
            <div className="mt-4 rounded-[20px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-800">
              Akun yang sedang Anda pakai tidak ditampilkan di daftar ini. Reset password dan hapus akun sendiri harus
              dilakukan lewat jalur terpisah agar session operasional aktif tidak terputus tanpa sengaja.
            </div>
            <div className="mt-6 space-y-4">
              {teamProfiles.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                  Belum ada akun operasional tambahan. Operations manager atau superadmin bisa membuat akun pertama dari panel ini.
                </div>
              ) : (
                teamProfiles.map((profile) => (
                  <div key={profile.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Username</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-950">{profile.username || "(tanpa username)"}</h3>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
                          {formatAdminCode(profile.id)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">{getRoleLabel(profile.role)}</p>
                        <p className="mt-2 text-xs text-slate-500">Kode akun: {formatAdminCode(profile.id)}</p>
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
                            Reset
                          </button>
                        </form>
                        <form action={deleteAdminAccount}>
                          <input type="hidden" name="adminId" value={profile.id} />
                          <input type="hidden" name="return_to" value={basePath} />
                          <button className="w-full rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                            Hapus
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
