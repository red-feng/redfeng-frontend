import Link from "next/link"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getFinanceSettings } from "@/lib/finance/settings"
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

type FinancePortal = "finance" | "superadmin"

export default async function FinanceSettingsPage({
  searchParams,
  portal = "finance",
}: {
  searchParams: Promise<{ success?: string; error?: string }>
  portal?: FinancePortal
}) {
  const params = await searchParams
  const adminSupabase = createAdminClient()
  const supabase = await createClient(portal)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(portal === "superadmin" ? "/superadmin/login" : "/finance/login")
  }

  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null }
  const canEditSettings = currentProfile?.role === "finance_manager"
  const dashboardHref = portal === "superadmin" ? "/superadmin/finance-manager" : "/finance/dashboard"
  const settings = await getFinanceSettings(
    adminSupabase as unknown as Parameters<typeof getFinanceSettings>[0],
  )
  const bankFeePreview = merchantTransferBanks.slice(1, 5).map((bank) => ({
    label: bank.label,
    value: settings.merchantTransferFeeRules[bank.key] ?? settings.merchantTransferFee,
  }))

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-5 py-6 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:rounded-[32px] sm:px-8 sm:py-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_340px]">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
                Finance Settings
              </p>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
                Atur komisi, fee customer, pajak, dan biaya transfer merchant dari satu panel.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Halaman ini menjadi sumber aturan angka yang dipakai finance saat membaca margin, payout, dan struktur biaya transaksi customer.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Pulse settings</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Komisi Red Feng</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{settings.redfengCommissionPercent}%</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Pajak customer</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{settings.customerTaxPercent}%</p>
                </div>
                <div>
                  <p className="text-sm text-orange-50/80">Fee transfer default</p>
                  <p className="mt-1 text-2xl font-semibold text-white">Rp {settings.merchantTransferFee.toLocaleString("id-ID")}</p>
                </div>
              </div>
            </div>
          </div>
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
            <input type="hidden" name="portal" value={portal} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Panel pengaturan</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Aturan angka finance aktif</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Perubahan di panel ini memengaruhi struktur komisi, fee customer, dan biaya transfer yang dibaca workspace finance.
              </p>
            </div>
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
            ) : null}
          </form>

          <section className="space-y-6">
            <div className="rounded-[24px] border border-[#f3dbc3] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Snapshot aktif</p>
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Jalur keputusan</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Arah pembacaan finance settings</h2>
              <div className="mt-5 grid gap-3">
                <div className="rounded-[20px] border border-slate-950 bg-slate-950 px-4 py-4 text-sm font-semibold text-white">
                  <span className="block">Baca margin dan payout</span>
                  <span className="mt-1 block text-xs leading-6 text-white/80">
                    Komisi dan biaya transfer menjadi fondasi pembacaan payout merchant di workspace finance.
                  </span>
                </div>
                <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4 text-sm font-semibold text-slate-900">
                  <span className="block">Jaga ritme biaya customer</span>
                  <span className="mt-1 block text-xs leading-6 text-slate-500">
                    Admin fee dan tax customer ikut membentuk posisi dana yang dibaca dashboard finance.
                  </span>
                </div>
                <div className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] px-4 py-4 text-sm font-semibold text-slate-900">
                  <span className="block">Bandingkan fee per bank</span>
                  <span className="mt-1 block text-xs leading-6 text-slate-500">
                    Gunakan preview ini untuk membaca perbedaan biaya transfer merchant per bank utama.
                  </span>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {bankFeePreview.map((item) => (
                  <div key={item.label} className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">Rp {item.value.toLocaleString("id-ID")}</p>
                  </div>
                ))}
              </div>
            </div>
            <Link href={dashboardHref} className="inline-flex text-sm font-semibold text-orange-600">
              Kembali ke finance dashboard
            </Link>
          </section>
        </section>
      </div>
    </main>
  )
}
