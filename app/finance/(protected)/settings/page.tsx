import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { defaultFinanceSettings } from "@/lib/finance/settings"
import { isFinanceExecutionRole } from "@/lib/internal-roles"
import { saveFinanceSettings } from "./actions"

export default async function FinanceSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const params = await searchParams
  const adminSupabase = createAdminClient()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null }
  const canEditSettings = isFinanceExecutionRole(currentProfile?.role)
  const settingsResult = await ((adminSupabase
    .from("finance_settings")
    .select(
      "redfeng_commission_percent, customer_admin_fee_percent, customer_tax_percent, merchant_transfer_fee",
    )
    .eq("id", "default")
    .maybeSingle()) as unknown as Promise<{
    data: {
      redfeng_commission_percent?: number | string | null
      customer_admin_fee_percent?: number | string | null
      customer_tax_percent?: number | string | null
      merchant_transfer_fee?: number | string | null
    } | null
    error: { message?: string } | null
  }>)

  const settings = {
    redfengCommissionPercent: Number(
      settingsResult.data?.redfeng_commission_percent ?? defaultFinanceSettings.redfengCommissionPercent,
    ),
    customerAdminFeePercent: Number(
      settingsResult.data?.customer_admin_fee_percent ?? defaultFinanceSettings.customerAdminFeePercent,
    ),
    customerTaxPercent: Number(
      settingsResult.data?.customer_tax_percent ?? defaultFinanceSettings.customerTaxPercent,
    ),
    merchantTransferFee: Number(
      settingsResult.data?.merchant_transfer_fee ?? defaultFinanceSettings.merchantTransferFee,
    ),
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)]">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            Finance Settings
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Atur komisi Red Feng, fee customer, pajak, dan biaya transfer merchant.
          </h1>
        </section>

        {params.success && (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {params.success}
          </div>
        )}

        {params.error && (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {params.error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <form action={saveFinanceSettings} className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Komisi Red Feng (%)</label>
              <input
                name="redfeng_commission_percent"
                type="number"
                min="0"
                step="0.01"
                defaultValue={settings.redfengCommissionPercent}
                disabled={!canEditSettings}
                className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Admin fee customer (%)</label>
              <input
                name="customer_admin_fee_percent"
                type="number"
                min="0"
                step="0.01"
                defaultValue={settings.customerAdminFeePercent}
                disabled={!canEditSettings}
                className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Pajak customer (%)</label>
              <input
                name="customer_tax_percent"
                type="number"
                min="0"
                step="0.01"
                defaultValue={settings.customerTaxPercent}
                disabled={!canEditSettings}
                className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Biaya transfer merchant (Rp)</label>
              <input
                name="merchant_transfer_fee"
                type="number"
                min="0"
                step="1"
                defaultValue={settings.merchantTransferFee}
                disabled={!canEditSettings}
                className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
            {canEditSettings ? (
              <button className="rounded-[20px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                Simpan Setting
              </button>
            ) : (
              <div className="rounded-[20px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-700">
                Finance Manager dapat memonitor parameter keuangan, tetapi perubahan setting hanya dilakukan oleh finance eksekusi atau superadmin.
              </div>
            )}
          </form>

          <section className="space-y-6">
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Current snapshot</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p>Komisi Red Feng: {settings.redfengCommissionPercent}%</p>
                <p>Admin fee customer: {settings.customerAdminFeePercent}%</p>
                <p>Pajak customer: {settings.customerTaxPercent}%</p>
                <p>Biaya transfer merchant: Rp {settings.merchantTransferFee.toLocaleString("id-ID")}</p>
              </div>
            </div>
            <div className="rounded-[32px] border border-[#f3dbc3] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Fallback</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Jika migration belum dijalankan, sistem akan memakai default aman:
                komisi {defaultFinanceSettings.redfengCommissionPercent}%,
                admin fee {defaultFinanceSettings.customerAdminFeePercent}%,
                pajak {defaultFinanceSettings.customerTaxPercent}%,
                transfer Rp {defaultFinanceSettings.merchantTransferFee.toLocaleString("id-ID")}.
              </p>
              <Link href="/finance/dashboard" className="mt-5 inline-flex text-sm font-semibold text-orange-600">
                Kembali ke finance dashboard
              </Link>
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}
