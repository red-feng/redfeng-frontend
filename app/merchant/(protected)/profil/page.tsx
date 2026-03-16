import Image from "next/image"
import { type Locale, normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { createClient } from "@/lib/supabase/server"

type MerchantProfileRow = {
  company_name: string | null
  brand_name: string | null
  address: string | null
  city: string | null
  province: string | null
  logo_url: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
  bank_branch: string | null
  npwp_personal: string | null
  npwp_company: string | null
  pic_name: string | null
}

function maskedAccountNumber(value: string | null) {
  if (!value) return "-"
  if (value.length <= 4) return value
  return `${"*".repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`
}

export default async function MerchantProfilePage() {
  const locale = normalizeLocale(await getCurrentLocale())
  const t = getProfileText(locale)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("merchants")
    .select(
      "company_name, brand_name, address, city, province, logo_url, bank_name, bank_account_number, bank_account_holder, bank_branch, npwp_personal, npwp_company, pic_name",
    )
    .eq("user_id", user.id)
    .single()

  const merchant = data as MerchantProfileRow | null
  const addressLabel = [merchant?.address, merchant?.city, merchant?.province].filter(Boolean).join(", ") || "-"
  const metricCards = [
    {
      label: t.businessName,
      value: merchant?.company_name || "-",
      note: t.businessNameNote,
    },
    {
      label: t.brand,
      value: merchant?.brand_name || "-",
      note: t.brandNote,
    },
    {
      label: t.picContact,
      value: merchant?.pic_name || t.notAvailable,
      note: t.picContactNote,
    },
    {
      label: t.address,
      value: merchant ? `${merchant.city || "-"}, ${merchant.province || "-"}` : "-",
      note: t.addressNote,
    },
  ]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <section className="overflow-hidden rounded-[34px] border border-orange-100 bg-[linear-gradient(135deg,#983108_0%,#f76707_52%,#ffb357_100%)] text-white shadow-[0_28px_80px_rgba(194,65,12,0.24)]">
        <div className="grid gap-6 px-7 py-8 lg:grid-cols-[minmax(0,1.4fr)_400px] lg:px-10 lg:py-10">
          <div>
            <div className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/90">
              {t.heroBadge}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-5xl">
              {t.heroTitle}
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/90 md:text-base">
              {t.heroDescription}
            </p>
          </div>

          <div className="rounded-[28px] border border-white/30 bg-white/12 p-5 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">{t.identitySnapshot}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{t.brand}</p>
                <p className="mt-2 text-lg font-semibold text-white">{merchant?.brand_name || merchant?.company_name || "-"}</p>
              </div>
              <div className="rounded-[20px] border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{t.pic}</p>
                <p className="mt-2 text-lg font-semibold text-white">{merchant?.pic_name || t.notAvailable}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error || !merchant ? (
        <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {t.loadError}
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[26px] border border-[#f0ddc7] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">{card.label}</p>
                <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-950">{card.value}</p>
                <p className="mt-2 text-xs leading-6 text-slate-500">{card.note}</p>
              </div>
            ))}
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <div className="flex flex-col items-center text-center">
                {merchant.logo_url ? (
                  <Image
                    src={merchant.logo_url}
                      alt={merchant.brand_name || t.logoAlt}
                    width={160}
                    height={160}
                    unoptimized
                    className="h-36 w-36 rounded-[28px] object-cover"
                  />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-[28px] border border-[#eadfce] bg-[#fffaf3] text-sm text-slate-500">
                      {t.logoMissing}
                  </div>
                )}
                <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  {merchant.brand_name || merchant.company_name || "-"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{merchant.company_name || "-"}</p>
                <div className="mt-5 w-full rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] p-4 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.businessAddress}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{addressLabel}</p>
                </div>
              </div>
            </aside>

            <main className="space-y-6">
              <section className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.businessIdentity}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{t.businessInformation}</h2>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                      <p className="text-sm text-slate-500">{t.businessName}</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.company_name || "-"}</p>
                  </div>
                  <div>
                      <p className="text-sm text-slate-500">{t.brandName}</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.brand_name || "-"}</p>
                  </div>
                  <div className="md:col-span-2">
                      <p className="text-sm text-slate-500">{t.description}</p>
                      <p className="mt-2 font-medium text-slate-950">{t.descriptionUnavailable}</p>
                  </div>
                  <div className="md:col-span-2">
                      <p className="text-sm text-slate-500">{t.address}</p>
                    <p className="mt-2 font-medium text-slate-950">{addressLabel}</p>
                  </div>
                  <div>
                      <p className="text-sm text-slate-500">{t.contact}</p>
                      <p className="mt-2 font-medium text-slate-950">{merchant.pic_name || t.notAvailable}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.bankAccountSection}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{t.bankAccount}</h2>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                      <p className="text-sm text-slate-500">{t.bankName}</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.bank_name || "-"}</p>
                  </div>
                  <div>
                      <p className="text-sm text-slate-500">{t.bankBranch}</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.bank_branch || "-"}</p>
                  </div>
                  <div>
                      <p className="text-sm text-slate-500">{t.accountHolder}</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.bank_account_holder || "-"}</p>
                  </div>
                  <div>
                      <p className="text-sm text-slate-500">{t.accountNumber}</p>
                    <p className="mt-2 font-medium text-slate-950">{maskedAccountNumber(merchant.bank_account_number)}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.taxIdentity}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">NPWP</h2>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                      <p className="text-sm text-slate-500">{t.personalTaxId}</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.npwp_personal || "-"}</p>
                  </div>
                  <div>
                      <p className="text-sm text-slate-500">{t.companyTaxId}</p>
                    <p className="mt-2 font-medium text-slate-950">{merchant.npwp_company || "-"}</p>
                  </div>
                </div>
              </section>
            </main>
          </div>
        </>
      )}
    </main>
  )
}

function getProfileText(locale: Locale) {
  const dict = {
    id: {
      heroBadge: "Merchant Profile",
      heroTitle: "Identitas merchant yang lebih rapi untuk operasional, payout, dan kepercayaan customer.",
      heroDescription:
        "Kelola informasi bisnis, detail rekening, dan dokumen inti merchant dengan tampilan yang lebih premium dan lebih siap untuk kebutuhan OTA yang terus berkembang.",
      identitySnapshot: "Identity Snapshot",
      businessName: "Nama bisnis",
      businessNameNote: "Identitas legal merchant",
      brand: "Brand",
      brandNote: "Nama yang tampil ke customer",
      pic: "PIC",
      picContact: "Kontak PIC",
      picContactNote: "Penanggung jawab merchant",
      address: "Alamat",
      addressNote: "Lokasi operasional merchant",
      loadError: "Gagal memuat profil merchant.",
      logoAlt: "Logo Merchant",
      logoMissing: "Logo belum ada",
      businessAddress: "Alamat bisnis",
      businessIdentity: "Business Identity",
      businessInformation: "Informasi bisnis",
      brandName: "Nama brand",
      description: "Deskripsi",
      descriptionUnavailable: "Belum tersedia di schema merchant saat ini.",
      contact: "Kontak",
      bankAccountSection: "Bank Account",
      bankAccount: "Rekening bank",
      bankName: "Nama bank",
      bankBranch: "Cabang bank",
      accountHolder: "Atas nama",
      accountNumber: "Nomor rekening",
      taxIdentity: "Tax Identity",
      personalTaxId: "NPWP Personal",
      companyTaxId: "NPWP Perusahaan",
      notAvailable: "Belum tersedia",
    },
    en: {
      heroBadge: "Merchant Profile",
      heroTitle: "A cleaner merchant identity for operations, payouts, and customer trust.",
      heroDescription:
        "Manage business information, bank account details, and core merchant documents in a more premium view that is better prepared for growing OTA needs.",
      identitySnapshot: "Identity Snapshot",
      businessName: "Business name",
      businessNameNote: "Merchant legal identity",
      brand: "Brand",
      brandNote: "Name shown to customers",
      pic: "PIC",
      picContact: "PIC contact",
      picContactNote: "Merchant person in charge",
      address: "Address",
      addressNote: "Merchant operational location",
      loadError: "Failed to load merchant profile.",
      logoAlt: "Merchant logo",
      logoMissing: "No logo yet",
      businessAddress: "Business address",
      businessIdentity: "Business Identity",
      businessInformation: "Business information",
      brandName: "Brand name",
      description: "Description",
      descriptionUnavailable: "Not available in the current merchant schema yet.",
      contact: "Contact",
      bankAccountSection: "Bank Account",
      bankAccount: "Bank account",
      bankName: "Bank name",
      bankBranch: "Bank branch",
      accountHolder: "Account holder",
      accountNumber: "Account number",
      taxIdentity: "Tax Identity",
      personalTaxId: "Personal tax ID",
      companyTaxId: "Company tax ID",
      notAvailable: "Not available",
    },
    zh: {
      heroBadge: "商家资料",
      heroTitle: "更清晰的商家身份资料，便于运营、结算与建立客户信任。",
      heroDescription: "以更高级、更适合 OTA 运营的方式管理商家业务信息、收款账户和核心资料文件。",
      identitySnapshot: "身份概览",
      businessName: "企业名称",
      businessNameNote: "商家的法定主体信息",
      brand: "品牌",
      brandNote: "展示给客户的名称",
      pic: "负责人",
      picContact: "负责人联系",
      picContactNote: "商家主要负责人",
      address: "地址",
      addressNote: "商家运营所在地",
      loadError: "加载商家资料失败。",
      logoAlt: "商家标志",
      logoMissing: "暂无标志",
      businessAddress: "企业地址",
      businessIdentity: "企业身份",
      businessInformation: "企业信息",
      brandName: "品牌名称",
      description: "描述",
      descriptionUnavailable: "当前 merchant schema 中暂未提供该字段。",
      contact: "联系方式",
      bankAccountSection: "银行账户",
      bankAccount: "银行账户",
      bankName: "银行名称",
      bankBranch: "银行分行",
      accountHolder: "账户姓名",
      accountNumber: "账号",
      taxIdentity: "税务信息",
      personalTaxId: "个人税号",
      companyTaxId: "公司税号",
      notAvailable: "暂未提供",
    },
  } satisfies Record<Locale, Record<string, string>>

  return dict[locale]
}
