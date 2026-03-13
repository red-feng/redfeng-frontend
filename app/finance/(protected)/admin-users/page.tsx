import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  createAdminAccount,
  createFinanceAccount,
  deleteAdminAccount,
  deleteFinanceAccount,
  resetAdminPassword,
  resetFinancePassword,
} from "./actions"

type SearchParams = Promise<{ success?: string; error?: string }>

export default async function FinanceAdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null }
  const adminSupabase = createAdminClient()
  const isSuperadmin = currentProfile?.role === "superadmin"

  const { data: profiles } = await adminSupabase
    .from("profiles")
    .select("id, username, role")
    .eq("role", "admin")
    .order("username", { ascending: true })

  const { data: financeRoleProfiles } = isSuperadmin
    ? await adminSupabase.from("profiles").select("id, role").eq("role", "finance")
    : { data: [] }

  const { data: financeProfilesRaw } = isSuperadmin
    ? await adminSupabase.auth.admin.listUsers()
    : { data: { users: [] } }

  const adminProfiles = profiles || []
  const financeProfileIds = new Set((financeRoleProfiles || []).map((profile) => profile.id))
  const financeProfiles = (financeProfilesRaw?.users || [])
    .filter((authUser) => authUser.id !== user?.id)
    .filter((authUser) => financeProfileIds.has(authUser.id))
    .sort((a, b) => (a.email || "").localeCompare(b.email || ""))

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)]">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            Internal Account Control
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Akun internal dikelola berlapis oleh finance dan superadmin.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-orange-50/90">
            Finance membuat akun login admin berbasis username dan password internal. Superadmin mengelola akun finance
            agar struktur akses tetap rapi. Semua akun admin tetap memakai database yang sama, jadi keputusan approve,
            reject, dan update status langsung terlihat di akun admin lainnya.
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

        {isSuperadmin ? (
          <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-6">
              <form
                action={createFinanceAccount}
                className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Create finance</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Buat akun finance baru</h2>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Email finance</label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="mis: finance.ops@redfeng.co"
                      className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                    />
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
                    Buat akun finance
                  </button>
                </div>
              </form>

              <div className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Superadmin control</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <p>1. Superadmin membuat dan menghapus akun finance.</p>
                  <p>2. Finance yang sudah aktif kemudian membuat dan mengelola akun admin internal.</p>
                  <p>3. Dengan pola ini, akun operasional tetap punya pemisahan tugas yang jelas.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Finance accounts</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Daftar akun finance</h2>
              <div className="mt-6 space-y-4">
                {financeProfiles.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                    Belum ada akun finance tambahan. Superadmin bisa membuat akun finance pertama dari panel ini.
                  </div>
                ) : (
                  financeProfiles.map((profile) => (
                    <div key={profile.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Email finance</p>
                          <h3 className="mt-2 text-xl font-semibold text-slate-950">{profile.email || "(tanpa email)"}</h3>
                          <p className="mt-2 text-xs text-slate-500">ID akun: {profile.id}</p>
                        </div>
                        <div className="flex flex-col gap-3 md:min-w-[260px]">
                          <form action={resetFinancePassword} className="space-y-3">
                            <input type="hidden" name="financeId" value={profile.id} />
                            <input
                              name="password"
                              type="text"
                              minLength={8}
                              required
                              placeholder="Password baru finance"
                              className="w-full rounded-[16px] border border-[#e6d8c2] bg-white px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                            />
                            <button className="w-full rounded-[16px] border border-orange-200 bg-white px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50">
                              Reset password
                            </button>
                          </form>
                          <form action={deleteFinanceAccount}>
                            <input type="hidden" name="financeId" value={profile.id} />
                            <button className="w-full rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                              Hapus akun finance
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
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="space-y-6">
            <form
              action={createAdminAccount}
              className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Create admin</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Buat akun admin baru</h2>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Username admin</label>
                  <input
                    name="username"
                    type="text"
                    required
                    placeholder="mis: admin.operasional"
                    className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                  />
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
                  Buat akun admin
                </button>
              </div>
            </form>

            <div className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Integrasi admin</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>1. Semua akun admin membaca dan menulis ke data operasional yang sama.</p>
                <p>2. Jika admin 1 menolak paket merchant, status penolakan yang sama langsung terlihat di admin lain.</p>
                <p>3. Jika admin 2 approve merchant atau handoff booking ke finance, perubahan yang sama langsung tersimpan global.</p>
                {isSuperadmin ? <p>4. Superadmin tetap bisa mengakses panel ini, tetapi pembuatan akun finance hanya muncul untuk superadmin.</p> : null}
              </div>
              <Link href="/finance/dashboard" className="mt-5 inline-flex text-sm font-semibold text-orange-600">
                Kembali ke finance dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Admin accounts</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Daftar akun admin</h2>
            <div className="mt-6 space-y-4">
              {adminProfiles.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#e8d7c1] bg-[#fffaf3] px-5 py-6 text-sm text-slate-500">
                  Belum ada akun admin biasa. Finance bisa membuat akun admin pertama dari panel ini.
                </div>
              ) : (
                adminProfiles.map((profile) => (
                  <div key={profile.id} className="rounded-[24px] border border-[#efe1cf] bg-[#fffaf3] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Username admin</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-950">{profile.username || "(tanpa username)"}</h3>
                        <p className="mt-2 text-xs text-slate-500">ID akun: {profile.id}</p>
                      </div>
                      <div className="flex flex-col gap-3 md:min-w-[260px]">
                        <form action={resetAdminPassword} className="space-y-3">
                          <input type="hidden" name="adminId" value={profile.id} />
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
                          <button className="w-full rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                            Hapus akun admin
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
