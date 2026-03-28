import Link from "next/link"
import { redirect } from "next/navigation"
import { formatAdminCode } from "@/lib/merchant-code"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  createSuperadminAccount,
  deleteSuperadminAccount,
  resetSuperadminPassword,
} from "./actions"

type SearchParams = Promise<{ success?: string; error?: string }>

export default async function SuperadminAccountsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/superadmin/login")
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!currentProfile || currentProfile.role !== "superadmin") {
    redirect("/superadmin/dashboard")
  }

  const adminSupabase = createAdminClient()
  const { data: superadminProfiles } = await adminSupabase
    .from("profiles")
    .select("id, username, role")
    .eq("role", "superadmin")
    .order("username", { ascending: true })

  const otherSuperadmins = (superadminProfiles || []).filter((profile) => profile.id !== user.id)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[32px] border border-violet-200/60 bg-[linear-gradient(135deg,#3b0764_0%,#6d28d9_40%,#8b5cf6_72%,#c4b5fd_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(76,29,149,0.2)]">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-violet-50">
            Superadmin Accounts
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Panel khusus untuk membuat dan menjaga akun superadmin Red Feng.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-violet-50/90">
            Area ini sengaja dipisahkan dari akun admin team dan finance team. Hanya superadmin aktif yang boleh membuat,
            reset password, atau menghapus akun superadmin lain.
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
              action={createSuperadminAccount}
              className="rounded-[32px] border border-violet-200/50 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
            >
              <input type="hidden" name="return_to" value="/superadmin/superadmin-accounts" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-600">Create superadmin account</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                Buat akun superadmin baru
              </h2>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Username superadmin</label>
                  <input
                    name="username"
                    type="text"
                    required
                    placeholder="mis: superadmin.redfeng"
                    className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-violet-500 transition focus:ring-2"
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
                    className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-violet-500 transition focus:ring-2"
                  />
                </div>
                <button className="rounded-[20px] bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-800">
                  Buat akun superadmin
                </button>
              </div>
            </form>

            <div className="rounded-[32px] border border-violet-200/50 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-600">Guard rails</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                <p>1. Panel ini hanya untuk akun superadmin, tidak dipakai membuat admin, manager, atau finance team.</p>
                <p>2. Superadmin yang sedang dipakai login tidak bisa dihapus dari panel ini agar akses utama tidak terputus.</p>
                <p>3. Gunakan jumlah akun superadmin sesedikit mungkin, idealnya satu utama dan satu cadangan.</p>
              </div>
              <Link href="/superadmin/dashboard" className="mt-5 inline-flex text-sm font-semibold text-violet-700">
                Kembali ke superadmin dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-violet-200/50 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-600">Superadmin directory</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Daftar akun superadmin</h2>
            <div className="mt-6 space-y-4">
              {otherSuperadmins.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-violet-200 bg-violet-50/40 px-5 py-6 text-sm text-slate-500">
                  Belum ada akun superadmin tambahan. Gunakan panel kiri untuk membuat akun cadangan bila diperlukan.
                </div>
              ) : (
                otherSuperadmins.map((profile) => (
                  <div key={profile.id} className="rounded-[24px] border border-violet-100 bg-violet-50/30 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-600">Username akun</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-950">{profile.username || "(tanpa username)"}</h3>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
                          {formatAdminCode(profile.id)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">Role: superadmin</p>
                        <p className="mt-2 text-xs text-slate-500">ID akun: {profile.id}</p>
                      </div>
                      <div className="flex flex-col gap-3 md:min-w-[260px]">
                        <form action={resetSuperadminPassword} className="space-y-3">
                          <input type="hidden" name="superadminId" value={profile.id} />
                          <input type="hidden" name="return_to" value="/superadmin/superadmin-accounts" />
                          <input
                            name="password"
                            type="text"
                            minLength={8}
                            required
                            placeholder="Password baru superadmin"
                            className="w-full rounded-[16px] border border-[#e6d8c2] bg-white px-4 py-3 text-sm outline-none ring-violet-500 transition focus:ring-2"
                          />
                          <button className="w-full rounded-[16px] border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">
                            Reset password
                          </button>
                        </form>
                        <form action={deleteSuperadminAccount}>
                          <input type="hidden" name="superadminId" value={profile.id} />
                          <input type="hidden" name="return_to" value="/superadmin/superadmin-accounts" />
                          <button className="w-full rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                            Hapus akun superadmin
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
