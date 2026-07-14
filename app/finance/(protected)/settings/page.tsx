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

const productSettings = [
  {
    key: "flights",
    label: "Pesawat",
    publicHref: "/pesawat",
    status: "Aktif",
    summary: "Markup persen dengan batas minimum dan maksimum per pax.",
  },
  {
    key: "hotels",
    label: "Hotel",
    publicHref: "/hotel",
    status: "Global",
    summary: "Mengikuti customer fee dan tax global sampai margin engine hotel dipisah.",
  },
  {
    key: "trains",
    label: "Kereta Api",
    publicHref: "/kereta",
    status: "Global",
    summary: "Mengikuti customer fee dan tax global.",
  },
  {
    key: "bus-travel",
    label: "Bus & Travel",
    publicHref: "/bus",
    status: "Global",
    summary: "Mengikuti customer fee dan tax global.",
  },
  {
    key: "ferries",
    label: "Kapal Laut",
    publicHref: "/kapal",
    status: "Global",
    summary: "Mengikuti customer fee dan tax global.",
  },
  {
    key: "cruises",
    label: "Kapal Pesiar",
    publicHref: "/kapal-pesiar",
    status: "Global",
    summary: "Mengikuti customer fee dan tax global.",
  },
  {
    key: "activities",
    label: "Aktivitas",
    publicHref: "/aktivitas",
    status: "Global",
    summary: "Mengikuti customer fee dan tax global.",
  },
  {
    key: "packages",
    label: "Paket Tour",
    publicHref: "/packages",
    status: "Aktif",
    summary: "Memakai komisi RedFeng untuk pembacaan margin dan payout merchant.",
  },
] as const

const utilitySections = [
  { key: "customer-fees", label: "Customer Fee & Tax", summary: "Admin fee customer dan pajak transaksi." },
  { key: "merchant-transfer", label: "Merchant Transfer", summary: "Biaya transfer payout merchant per bank." },
] as const

type FinancePortal = "finance" | "superadmin"
type ProductSectionKey = (typeof productSettings)[number]["key"]
type UtilitySectionKey = (typeof utilitySections)[number]["key"]
type SettingsSectionKey = "overview" | ProductSectionKey | UtilitySectionKey

function normalizeSection(section?: string | null): SettingsSectionKey {
  const value = String(section || "overview").trim().toLowerCase()
  if (value === "overview") return "overview"
  const productSection = productSettings.find((item) => item.key === value)
  if (productSection) return productSection.key
  const utilitySection = utilitySections.find((item) => item.key === value)
  if (utilitySection) return utilitySection.key
  return "overview"
}

function getSettingsBasePath(portal: FinancePortal) {
  return portal === "superadmin" ? "/superadmin/finance-settings" : "/finance/settings"
}

function getSettingsHref(portal: FinancePortal, section: SettingsSectionKey) {
  const basePath = getSettingsBasePath(portal)
  return section === "overview" ? basePath : `${basePath}/${section}`
}

function getDashboardHref(portal: FinancePortal) {
  return portal === "superadmin" ? "/superadmin/finance-manager" : "/finance/dashboard"
}

function getSectionTitle(section: SettingsSectionKey) {
  if (section === "overview") return "Overview"
  return (
    productSettings.find((item) => item.key === section)?.label ||
    utilitySections.find((item) => item.key === section)?.label ||
    "Overview"
  )
}

function SectionTabs({ portal, section }: { portal: FinancePortal; section: SettingsSectionKey }) {
  const sections = [
    { key: "overview" as const, label: "Overview" },
    ...productSettings.map((item) => ({ key: item.key, label: item.label })),
    ...utilitySections.map((item) => ({ key: item.key, label: item.label })),
  ]

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {sections.map((item) => {
        const active = item.key === section
        return (
          <Link
            key={item.key}
            href={getSettingsHref(portal, item.key)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
              active
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-[#efd8c8] bg-white text-slate-600 hover:border-orange-300 hover:text-orange-600"
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

function FormShell({
  canEdit,
  children,
  portal,
  returnPath,
}: {
  canEdit: boolean
  children: React.ReactNode
  portal: FinancePortal
  returnPath: string
}) {
  return (
    <form
      action={saveFinanceSettings}
      className="space-y-5 rounded-[24px] border border-[#f3dbc3] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6"
    >
      <input type="hidden" name="portal" value={portal} />
      <input type="hidden" name="return_path" value={returnPath} />
      {children}
      {canEdit ? (
        <button className="w-full rounded-[20px] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto">
          Simpan Setting
        </button>
      ) : null}
    </form>
  )
}

function NumberInput({
  defaultValue,
  disabled,
  label,
  name,
  step = "0.01",
}: {
  defaultValue: number
  disabled: boolean
  label: string
  name: string
  step?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <input
        name={name}
        type="number"
        min="0"
        step={step}
        defaultValue={defaultValue}
        disabled={disabled}
        className="w-full rounded-[20px] border border-[#e6d8c2] bg-[#fffdf9] px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
      />
    </div>
  )
}

function OverviewSection({
  portal,
  settings,
}: {
  portal: FinancePortal
  settings: Awaited<ReturnType<typeof getFinanceSettings>>
}) {
  const flightPricing = settings.flightPricing || {
    markupPercent: 2,
    minimumMarginAmount: 20000,
    maximumMarginAmount: 75000,
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-[#f3dbc3] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Pesawat</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{flightPricing.markupPercent}%</p>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            Min Rp {flightPricing.minimumMarginAmount.toLocaleString("id-ID")} / pax, max Rp {flightPricing.maximumMarginAmount.toLocaleString("id-ID")} / pax.
          </p>
        </div>
        <div className="rounded-[24px] border border-[#f3dbc3] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Paket Tour</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{settings.redfengCommissionPercent}%</p>
          <p className="mt-2 text-xs leading-6 text-slate-500">Komisi RedFeng untuk margin dan payout merchant.</p>
        </div>
        <div className="rounded-[24px] border border-[#f3dbc3] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Customer Fee</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{settings.customerAdminFeeRules.bank_transfer}%</p>
          <p className="mt-2 text-xs leading-6 text-slate-500">Bank transfer aktif; QRIS {settings.customerAdminFeeRules.qris}%, kartu kredit {settings.customerAdminFeeRules.credit_card}%.</p>
        </div>
        <div className="rounded-[24px] border border-[#f3dbc3] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Tax & Transfer</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{settings.customerTaxPercent}%</p>
          <p className="mt-2 text-xs leading-6 text-slate-500">Transfer merchant default Rp {settings.merchantTransferFee.toLocaleString("id-ID")}.</p>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#f3dbc3] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Produk RedFeng</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Submenu finance per produk</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {productSettings.map((product) => (
            <Link
              key={product.key}
              href={getSettingsHref(portal, product.key)}
              className="rounded-[20px] border border-[#efe1cf] bg-[#fffaf3] p-4 transition hover:border-orange-300 hover:bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950">{product.label}</p>
                <span className="rounded-full border border-orange-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-600">
                  {product.status}
                </span>
              </div>
              <p className="mt-3 text-xs leading-6 text-slate-500">{product.summary}</p>
              <p className="mt-4 text-xs font-semibold text-orange-600">Buka setting</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function FlightSection({
  canEdit,
  portal,
  returnPath,
  settings,
}: {
  canEdit: boolean
  portal: FinancePortal
  returnPath: string
  settings: Awaited<ReturnType<typeof getFinanceSettings>>
}) {
  const flightPricing = settings.flightPricing || {
    markupPercent: 2,
    minimumMarginAmount: 20000,
    maximumMarginAmount: 75000,
  }

  return (
    <FormShell canEdit={canEdit} portal={portal} returnPath={returnPath}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Pesawat</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Aturan profit pesawat</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          Harga katalog pesawat = biaya supplier + spread RedFeng + pajak customer. Admin fee baru ditambahkan
          saat customer lanjut ke pembayaran.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <NumberInput
          defaultValue={flightPricing.markupPercent}
          disabled={!canEdit}
          label="Markup pesawat (%)"
          name="flight_markup_percent"
        />
        <NumberInput
          defaultValue={flightPricing.minimumMarginAmount}
          disabled={!canEdit}
          label="Margin minimum per pax (Rp)"
          name="flight_minimum_margin_amount"
          step="1"
        />
        <NumberInput
          defaultValue={flightPricing.maximumMarginAmount}
          disabled={!canEdit}
          label="Margin maksimum per pax (Rp)"
          name="flight_maximum_margin_amount"
          step="1"
        />
      </div>
    </FormShell>
  )
}

function PackagesSection({
  canEdit,
  portal,
  returnPath,
  settings,
}: {
  canEdit: boolean
  portal: FinancePortal
  returnPath: string
  settings: Awaited<ReturnType<typeof getFinanceSettings>>
}) {
  return (
    <FormShell canEdit={canEdit} portal={portal} returnPath={returnPath}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Paket Tour</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Komisi RedFeng merchant</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          Komisi ini dipakai untuk membaca margin dan estimasi payout produk merchant seperti Paket Tour.
        </p>
      </div>
      <NumberInput
        defaultValue={settings.redfengCommissionPercent}
        disabled={!canEdit}
        label="Komisi RedFeng (%)"
        name="redfeng_commission_percent"
      />
    </FormShell>
  )
}

function CustomerFeesSection({
  canEdit,
  portal,
  returnPath,
  settings,
}: {
  canEdit: boolean
  portal: FinancePortal
  returnPath: string
  settings: Awaited<ReturnType<typeof getFinanceSettings>>
}) {
  return (
    <FormShell canEdit={canEdit} portal={portal} returnPath={returnPath}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Customer Fee & Tax</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Biaya customer lintas produk</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          Admin fee dan tax ini membentuk total bayar customer setelah subtotal produk.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <NumberInput
          defaultValue={settings.customerAdminFeeRules.bank_transfer}
          disabled={!canEdit}
          label="Admin fee customer bank transfer (%)"
          name="customer_admin_fee_bank_transfer_percent"
        />
        <NumberInput
          defaultValue={settings.customerAdminFeeRules.qris}
          disabled={!canEdit}
          label="Admin fee customer QRIS (%)"
          name="customer_admin_fee_qris_percent"
        />
        <NumberInput
          defaultValue={settings.customerAdminFeeRules.credit_card}
          disabled={!canEdit}
          label="Admin fee customer kartu kredit (%)"
          name="customer_admin_fee_credit_card_percent"
        />
        <NumberInput
          defaultValue={settings.customerTaxPercent}
          disabled={!canEdit}
          label="Pajak customer (%)"
          name="customer_tax_percent"
        />
      </div>
    </FormShell>
  )
}

function MerchantTransferSection({
  canEdit,
  portal,
  returnPath,
  settings,
}: {
  canEdit: boolean
  portal: FinancePortal
  returnPath: string
  settings: Awaited<ReturnType<typeof getFinanceSettings>>
}) {
  return (
    <FormShell canEdit={canEdit} portal={portal} returnPath={returnPath}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Merchant Transfer</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Biaya transfer payout merchant</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          Biaya ini dipakai saat finance membaca posisi payout merchant per bank.
        </p>
      </div>
      <NumberInput
        defaultValue={settings.merchantTransferFee}
        disabled={!canEdit}
        label="Biaya transfer merchant default (Rp)"
        name="merchant_transfer_fee"
        step="1"
      />
      <div className="rounded-[20px] border border-[#f3dbc3] bg-[#fffaf4] p-4 sm:rounded-[24px] sm:p-5">
        <p className="text-sm font-semibold text-slate-900">Biaya transfer per bank merchant</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {merchantTransferBanks.map((bank) => (
            <NumberInput
              key={bank.key}
              defaultValue={settings.merchantTransferFeeRules[bank.key] ?? settings.merchantTransferFee}
              disabled={!canEdit}
              label={bank.label}
              name={`merchant_transfer_fee_${bank.key}`}
              step="1"
            />
          ))}
        </div>
      </div>
    </FormShell>
  )
}

function ProductPlaceholderSection({
  portal,
  section,
}: {
  portal: FinancePortal
  section: SettingsSectionKey
}) {
  const product = productSettings.find((item) => item.key === section)
  if (!product) return null

  return (
    <section className="rounded-[24px] border border-[#f3dbc3] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{product.label}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Setting finance produk belum dipisah</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
        Produk ini sudah disediakan subhalamannya, tetapi margin engine khususnya belum tersambung ke finance settings.
        Untuk saat ini total customer tetap mengikuti Customer Fee & Tax global, dan biaya merchant tetap mengikuti Merchant Transfer.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={getSettingsHref(portal, "customer-fees")} className="rounded-full border border-orange-200 px-4 py-2 text-xs font-semibold text-orange-600">
          Buka Customer Fee & Tax
        </Link>
        <Link href={getSettingsHref(portal, "merchant-transfer")} className="rounded-full border border-orange-200 px-4 py-2 text-xs font-semibold text-orange-600">
          Buka Merchant Transfer
        </Link>
        <Link href={product.publicHref} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
          Lihat halaman produk
        </Link>
      </div>
    </section>
  )
}

function SettingsBody({
  canEdit,
  portal,
  returnPath,
  section,
  settings,
}: {
  canEdit: boolean
  portal: FinancePortal
  returnPath: string
  section: SettingsSectionKey
  settings: Awaited<ReturnType<typeof getFinanceSettings>>
}) {
  if (section === "overview") return <OverviewSection portal={portal} settings={settings} />
  if (section === "flights") {
    return <FlightSection canEdit={canEdit} portal={portal} returnPath={returnPath} settings={settings} />
  }
  if (section === "packages") {
    return <PackagesSection canEdit={canEdit} portal={portal} returnPath={returnPath} settings={settings} />
  }
  if (section === "customer-fees") {
    return <CustomerFeesSection canEdit={canEdit} portal={portal} returnPath={returnPath} settings={settings} />
  }
  if (section === "merchant-transfer") {
    return <MerchantTransferSection canEdit={canEdit} portal={portal} returnPath={returnPath} settings={settings} />
  }

  return <ProductPlaceholderSection portal={portal} section={section} />
}

export default async function FinanceSettingsPage({
  searchParams,
  portal = "finance",
  section,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
  portal?: FinancePortal
  section?: string
}) {
  const params = await searchParams
  const activeSection = normalizeSection(section)
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
  const settings = await getFinanceSettings(
    adminSupabase as unknown as Parameters<typeof getFinanceSettings>[0],
  )
  const returnPath = getSettingsHref(portal, activeSection)
  const dashboardHref = getDashboardHref(portal)

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
                Atur finance per produk RedFeng dari menu yang lebih rapi.
              </h1>
              <p className="mt-4 text-base leading-8 text-orange-50/90">
                Halaman aktif: {getSectionTitle(activeSection)}. Produk yang belum punya margin engine khusus tetap mengikuti aturan global.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/20 bg-white/10 px-4 py-4 backdrop-blur sm:px-5 sm:py-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-orange-100/80">Pulse settings</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-sm text-orange-50/80">Komisi RedFeng</p>
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

        <SectionTabs portal={portal} section={activeSection} />

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

        <SettingsBody
          canEdit={canEditSettings}
          portal={portal}
          returnPath={returnPath}
          section={activeSection}
          settings={settings}
        />

        <Link href={dashboardHref} className="inline-flex text-sm font-semibold text-orange-600">
          Kembali ke finance dashboard
        </Link>
      </div>
    </main>
  )
}
