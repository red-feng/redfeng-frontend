import Link from "next/link"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { defaultFinanceSettings, getFinanceSettings } from "@/lib/finance/settings"
import { saveFinanceSettings } from "./actions"

const merchantTransferBanks = [
  { key: "default", label: "Default / bank lain" },
  { key: "bca", label: "BCA" },
  { key: "bni", label: "BNI" },
  { key: "bri", label: "BRI" },
  { key: "mandiri", label: "Mandiri" },
  { key: "permata", label: "Permata" },
  { key: "cimb", label: "CIMB" },
  { key: "bsi", label: "BSI" },
] as const

export default async function FinanceSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const params = await searchParams
  const adminSupabase = createAdminClient()
  const supabase = await createClient("finance")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/finance/login")
  }

  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null }
  const canEditSettings = currentProfile?.role === "finance_manager"
  const settings = await getFinanceSettings(
    adminSupabase as unknown as Parameters<typeof getFinanceSettings>[0],
  )

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            Finance Settings
          </p>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
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

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_0.9fr]">
          <form action={saveFinanceSettings} className="space-y-5 rounded-[24px] border border-[#f3dbc3] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6">
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
              <label className="mb-2 block text-sm font-medium text-slate-700">Admin fee customer bank transfer (%)</label>
              <input
                name="customer_admin_fee_bank_transfer_percent"
                type="number"
                min="0"
                step="0.01"
                defaultValue={settings.customerAdminFeeRules.bank_transfer}
                disabled={!canEditSettings}
                className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Admin fee customer QRIS (%)</label>
              <input
                name="customer_admin_fee_qris_percent"
                type="number"
                min="0"
                step="0.01"
                defaultValue={settings.customerAdminFeeRules.qris}
                disabled={!canEditSettings}
                className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Admin fee customer kartu kredit (%)</label>
              <input
                name="customer_admin_fee_credit_card_percent"
                type="number"
                min="0"
                step="0.01"
                defaultValue={settings.customerAdminFeeRules.credit_card}
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
              <label className="mb-2 block text-sm font-medium text-slate-700">Biaya transfer merchant default (Rp)</label>
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
            <div className="rounded-[20px] border border-[#f3dbc3] bg-[#fffaf4] p-4 sm:rounded-[24px] sm:p-5">
              <p className="text-sm font-semibold text-slate-900">Biaya transfer per bank merchant</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {merchantTransferBanks.map((bank) => (
                  <div key={bank.key}>
                    <label className="mb-2 block text-sm font-medium text-slate-700">{bank.label}</label>
                    <input
                      name={`merchant_transfer_fee_${bank.key}`}
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={settings.merchantTransferFeeRules[bank.key] ?? settings.merchantTransferFee}
                      disabled={!canEditSettings}
                      className="w-full rounded-[20px] border border-[#e6d8c2] bg-white px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
                    />
                  </div>
                ))}
              </div>
            </div>
            {canEditSettings ? (
                <button className="w-full rounded-[20px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto">
                Simpan Setting
              </button>
            ) : (
              <div className="rounded-[20px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-700">
                Finance Settings dimiliki finance manager. Tim finance eksekusi tidak mengubah parameter ini dari portal finance.
              </div>
            )}
          </form>

          <section className="space-y-6">
            <div className="rounded-[24px] border border-[#f3dbc3] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Current snapshot</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <p>Komisi Red Feng: {settings.redfengCommissionPercent}%</p>
                <p>Admin fee customer bank transfer: {settings.customerAdminFeeRules.bank_transfer}%</p>
                <p>Admin fee customer QRIS: {settings.customerAdminFeeRules.qris}%</p>
                <p>Admin fee customer kartu kredit: {settings.customerAdminFeeRules.credit_card}%</p>
                <p>Pajak customer: {settings.customerTaxPercent}%</p>
                <p>Biaya transfer merchant default: Rp {settings.merchantTransferFee.toLocaleString("id-ID")}</p>
                <p>Transfer bank BCA: Rp {(settings.merchantTransferFeeRules.bca ?? settings.merchantTransferFee).toLocaleString("id-ID")}</p>
                <p>Transfer bank BNI: Rp {(settings.merchantTransferFeeRules.bni ?? settings.merchantTransferFee).toLocaleString("id-ID")}</p>
                <p>Transfer bank BRI: Rp {(settings.merchantTransferFeeRules.bri ?? settings.merchantTransferFee).toLocaleString("id-ID")}</p>
                <p>Transfer bank Mandiri: Rp {(settings.merchantTransferFeeRules.mandiri ?? settings.merchantTransferFee).toLocaleString("id-ID")}</p>
              </div>
            </div>
            <div className="rounded-[24px] border border-[#f3dbc3] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Fallback</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Jika migration belum dijalankan, sistem akan memakai default aman:
                komisi {defaultFinanceSettings.redfengCommissionPercent}%,
                admin fee bank transfer {defaultFinanceSettings.customerAdminFeeRules.bank_transfer}%,
                admin fee QRIS {defaultFinanceSettings.customerAdminFeeRules.qris}%,
                admin fee kartu kredit {defaultFinanceSettings.customerAdminFeeRules.credit_card}%,
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
