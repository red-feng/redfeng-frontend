import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { checkDharmawisataSupplierBalance } from "./actions"

type FinanceBalancePortal = "finance" | "superadmin"
type ResultRecord = Record<string, unknown>

function parseResult(value?: string): ResultRecord | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : { value: parsed }
  } catch {
    return { error: "Result tidak bisa dibaca sebagai JSON.", raw: value }
  }
}

function asText(value: unknown) {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

function getStatusClasses(status?: string) {
  if (status === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-800"
  if (status === "error") return "border-rose-200 bg-rose-50 text-rose-800"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

async function ensureSupplierBalancePageAccess(portal: FinanceBalancePortal) {
  const supabase = await createClient(portal)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(portal === "superadmin" ? "/superadmin/login" : "/finance/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (portal === "superadmin" ? profile?.role !== "superadmin" : profile?.role !== "finance_manager") {
    redirect(portal === "superadmin" ? "/superadmin/login" : "/finance/dashboard")
  }
}

export default async function SupplierBalancesPage({
  searchParams,
  portal = "finance",
}: {
  searchParams?: Promise<{ status?: string; result?: string }>
  portal?: FinanceBalancePortal
}) {
  await ensureSupplierBalancePageAccess(portal)

  const params = (await searchParams) || {}
  const result = parseResult(params.result)
  const dashboardHref = portal === "superadmin" ? "/superadmin/finance-manager" : "/finance/dashboard"
  const settingsHref = portal === "superadmin" ? "/superadmin/finance-settings" : "/finance/settings"
  const resultTitle = asText(result?.title) || "Belum ada hasil cek saldo"
  const balanceLabel = asText(result?.balanceFormatted) || "-"
  const statusLabel = asText(result?.status) || "-"
  const messageLabel = asText(result?.respMessage) || asText(result?.error) || "-"
  const respTimeLabel = asText(result?.respTime) || "-"
  const elapsedLabel = result?.elapsedMs ? `${asText(result.elapsedMs)} ms` : "-"

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_42%,#f97316_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.16fr)_340px]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Supplier Balance
              </span>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
                Pantau saldo agent supplier dari workspace finance manager.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Nominal deposit Dharmawisata berada di domain finance. Operations cukup membaca status operasional, sedangkan finance manager memegang angka saldo dan keputusan top-up.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Latest check</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Dharmawisata Agent</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{balanceLabel}</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Status</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{statusLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-[#f3dbc3] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Dharmawisata</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Cek saldo agent</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Tombol ini memanggil login Dharmawisata, mengambil access token baru, lalu menjalankan `POST Agent/Balance`. Token selalu di-redact.
            </p>

            <form action={checkDharmawisataSupplierBalance} className="mt-6">
              <input type="hidden" name="portal" value={portal} />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-[18px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
              >
                Cek saldo Dharmawisata
              </button>
            </form>

            <div className="mt-6 rounded-[22px] border border-sky-200 bg-sky-50 p-4 text-sm leading-7 text-sky-800">
              Saldo nominal hanya dibuka untuk finance manager dan superadmin. Operations manager dapat meminta finance mengecek saldo saat hold supplier terhambat.
            </div>
          </div>

          <div id="dharmawisata-balance-result" className={`rounded-[24px] border p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6 ${getStatusClasses(params.status)}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em]">Hasil cek</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{resultTitle}</h2>
              </div>
              <span className="rounded-[14px] border border-current px-3 py-1 text-xs font-semibold">
                {params.status ? params.status.toUpperCase() : "READY"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Balance", balanceLabel],
                ["Status", statusLabel],
                ["Message", messageLabel],
                ["Resp time", respTimeLabel],
                ["Elapsed", elapsedLabel],
                ["User ID", asText(result?.userID) || "-"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[18px] border border-current/20 bg-white/65 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
                  <p className="mt-2 break-words text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <pre className="mt-5 max-h-[360px] overflow-auto rounded-[18px] border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {JSON.stringify(result || { note: "Klik cek saldo untuk membaca response Agent/Balance." }, null, 2)}
            </pre>
          </div>
        </section>

        <section className="flex flex-wrap gap-3">
          <Link href={dashboardHref} className="rounded-[16px] border border-[#e7d6c1] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600">
            Kembali ke finance dashboard
          </Link>
          <Link href={settingsHref} className="rounded-[16px] border border-[#e7d6c1] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600">
            Finance settings
          </Link>
        </section>
      </div>
    </main>
  )
}
