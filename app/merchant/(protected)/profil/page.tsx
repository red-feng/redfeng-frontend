import Image from "next/image"
import Link from "next/link"
import { type Locale, normalizeLocale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { formatMerchantCode } from "@/lib/merchant-code"
import { createClient } from "@/lib/supabase/server"
import { updateMerchantProfile } from "./actions"

type MerchantProfileRow = {
  id: string
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
  pic_position: string | null
  ktp_number: string | null
  nib: string | null
}

function maskedAccountNumber(value: string | null) {
  if (!value) return "-"
  if (value.length <= 4) return value
  return `${"*".repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`
}

export default async function MerchantProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string; edit?: string }>
}) {
  const params = searchParams ? await searchParams : undefined
  const locale = normalizeLocale(await getCurrentLocale())
  const t = {
    merchantCode: "Merchant code",
    merchantCodeNote: "Premium merchant operational ID",
    ...getProfileText(locale),
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("merchants")
    .select(
      "id, company_name, brand_name, address, city, province, logo_url, bank_name, bank_account_number, bank_account_holder, bank_branch, npwp_personal, npwp_company, pic_name, pic_position, ktp_number, nib",
    )
    .eq("user_id", user.id)
    .single()

  const merchant = data as MerchantProfileRow | null
  const merchantCode = formatMerchantCode(merchant?.id)
  const addressLabel = [merchant?.address, merchant?.city, merchant?.province].filter(Boolean).join(", ") || "-"
  const successMessage = params?.success || ""
  const errorMessage = params?.error || ""
  const isEditing = params?.edit === "1"
  const editProfileButtonLabel =
    locale === "id" ? "Edit Profile" : locale === "zh" ? "编辑资料" : "Edit Profile"
  const cancelEditButtonLabel =
    locale === "id" ? "Batal Edit" : locale === "zh" ? "取消编辑" : "Cancel Edit"
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
      label: t.merchantCode,
      value: merchantCode,
      note: t.merchantCodeNote,
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{t.merchantCode}</p>
                <p className="mt-2 text-lg font-semibold text-white">{merchantCode}</p>
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
          {successMessage ? (
            <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}
          {errorMessage ? (
            <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}
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
                <div className="mt-4 inline-flex rounded-full border border-[#f0ddc7] bg-[#fff3e6] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-700">
                  {merchantCode}
                </div>
                <div className="mt-5 w-full rounded-[22px] border border-[#efe3d1] bg-[#fffaf3] p-4 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t.businessAddress}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{addressLabel}</p>
                </div>
                <div className="mt-5 flex w-full flex-col gap-3">
                  <Link
                    href={isEditing ? "/merchant/profil" : "/merchant/profil?edit=1"}
                    className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isEditing
                        ? "border border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600"
                        : "bg-[linear-gradient(135deg,#d86118_0%,#ef7f1a_100%)] text-white shadow-[0_14px_34px_rgba(216,97,24,0.28)] hover:-translate-y-0.5"
                    }`}
                  >
                    {isEditing ? cancelEditButtonLabel : editProfileButtonLabel}
                  </Link>
                </div>
              </div>
            </aside>

            <main className="space-y-6">
              {isEditing ? (
                <section className="rounded-[32px] border border-[#f3dbc3] bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">{t.profileEditorBadge}</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{t.editProfile}</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{t.editProfileHint}</p>
                    </div>
                    <div className="rounded-[22px] border border-orange-100 bg-[#fff8f1] px-4 py-3 text-sm text-slate-600">
                      {t.editProfileNote}
                    </div>
                  </div>

                  <form action={updateMerchantProfile} className="mt-6 space-y-6">
                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">{t.businessName}</span>
                        <input
                          name="company_name"
                          defaultValue={merchant.company_name || ""}
                          placeholder={t.businessNamePlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">{t.brandName}</span>
                        <input
                          name="brand_name"
                          defaultValue={merchant.brand_name || ""}
                          placeholder={t.brandNamePlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                    </div>

                    <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">{t.address}</span>
                        <textarea
                          name="address"
                          defaultValue={merchant.address || ""}
                          placeholder={t.addressPlaceholder}
                          rows={4}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                      <div className="grid gap-5">
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-slate-700">{t.city}</span>
                          <input
                            name="city"
                            defaultValue={merchant.city || ""}
                            placeholder={t.cityPlaceholder}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-slate-700">{t.province}</span>
                          <input
                            name="province"
                            defaultValue={merchant.province || ""}
                            placeholder={t.provincePlaceholder}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">{t.picName}</span>
                        <input
                          name="pic_name"
                          defaultValue={merchant.pic_name || ""}
                          placeholder={t.picNamePlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">{t.picPosition}</span>
                        <input
                          name="pic_position"
                          defaultValue={merchant.pic_position || ""}
                          placeholder={t.picPositionPlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">{t.ktpNumber}</span>
                        <input
                          name="ktp_number"
                          defaultValue={merchant.ktp_number || ""}
                          placeholder={t.ktpNumberPlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">{t.bankName}</span>
                        <input
                          name="bank_name"
                          defaultValue={merchant.bank_name || ""}
                          placeholder={t.bankNamePlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">{t.bankBranch}</span>
                        <input
                          name="bank_branch"
                          defaultValue={merchant.bank_branch || ""}
                          placeholder={t.bankBranchPlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">{t.accountHolder}</span>
                        <input
                          name="bank_account_holder"
                          defaultValue={merchant.bank_account_holder || ""}
                          placeholder={t.accountHolderPlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">{t.accountNumber}</span>
                        <input
                          name="bank_account_number"
                          defaultValue={merchant.bank_account_number || ""}
                          placeholder={t.accountNumberPlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">{t.personalTaxId}</span>
                        <input
                          name="npwp_personal"
                          defaultValue={merchant.npwp_personal || ""}
                          placeholder={t.personalTaxIdPlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">{t.companyTaxId}</span>
                        <input
                          name="npwp_company"
                          defaultValue={merchant.npwp_company || ""}
                          placeholder={t.companyTaxIdPlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">{t.nibNumber}</span>
                        <input
                          name="nib"
                          defaultValue={merchant.nib || ""}
                          placeholder={t.nibNumberPlaceholder}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm leading-7 text-slate-500">{t.editFormFooter}</p>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d86118_0%,#ef7f1a_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(216,97,24,0.28)] transition hover:-translate-y-0.5"
                      >
                        {t.saveChanges}
                      </button>
                    </div>
                  </form>
                </section>
              ) : null}

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
                  <div>
                      <p className="text-sm text-slate-500">{t.picPosition}</p>
                      <p className="mt-2 font-medium text-slate-950">{merchant.pic_position || t.notAvailable}</p>
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
                   <div>
                       <p className="text-sm text-slate-500">{t.ktpNumber}</p>
                     <p className="mt-2 font-medium text-slate-950">{merchant.ktp_number || "-"}</p>
                   </div>
                   <div>
                       <p className="text-sm text-slate-500">{t.nibNumber}</p>
                     <p className="mt-2 font-medium text-slate-950">{merchant.nib || "-"}</p>
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
      merchantCode: "Kode merchant",
      merchantCodeNote: "ID operasional premium merchant",
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
      profileEditorBadge: "Profile Editor",
      editProfile: "Edit profil merchant",
      editProfileHint: "Perbarui data bisnis, alamat operasional, PIC, rekening payout, dan identitas pajak langsung dari halaman ini.",
      editProfileNote: "Perubahan akan langsung tersimpan ke profil merchant Anda.",
      brandName: "Nama brand",
      businessNamePlaceholder: "PT Red Feng Digital Nusantara",
      brandNamePlaceholder: "Red Feng",
      addressPlaceholder: "Alamat operasional utama merchant",
      city: "Kota",
      cityPlaceholder: "Semarang",
      province: "Provinsi",
      provincePlaceholder: "Jawa Tengah",
      picName: "Nama PIC",
      picNamePlaceholder: "Nama penanggung jawab merchant",
      picPosition: "Jabatan PIC",
      picPositionPlaceholder: "Founder / Director / Manager",
      ktpNumber: "Nomor KTP",
      ktpNumberPlaceholder: "Nomor KTP penanggung jawab",
      description: "Deskripsi",
      descriptionUnavailable: "Belum tersedia di schema merchant saat ini.",
      contact: "Kontak",
      bankAccountSection: "Bank Account",
      bankAccount: "Rekening bank",
      bankName: "Nama bank",
      bankNamePlaceholder: "BCA / Mandiri / BNI / BRI",
      bankBranch: "Cabang bank",
      bankBranchPlaceholder: "Cabang bank payout",
      accountHolder: "Atas nama",
      accountHolderPlaceholder: "Nama pemilik rekening",
      accountNumber: "Nomor rekening",
      accountNumberPlaceholder: "Nomor rekening payout",
      taxIdentity: "Tax Identity",
      personalTaxId: "NPWP Personal",
      personalTaxIdPlaceholder: "Opsional jika tersedia",
      companyTaxId: "NPWP Perusahaan",
      companyTaxIdPlaceholder: "Nomor NPWP perusahaan",
      nibNumber: "Nomor NIB",
      nibNumberPlaceholder: "Nomor induk berusaha",
      editFormFooter: "Pastikan nama bisnis, brand, dan rekening payout tetap sesuai data legal merchant.",
      saveChanges: "Simpan perubahan",
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
      merchantCode: "Merchant code",
      merchantCodeNote: "Premium merchant operational ID",
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
      profileEditorBadge: "Profile Editor",
      editProfile: "Edit merchant profile",
      editProfileHint: "Update business details, operating address, PIC, payout bank account, and tax identity directly from this page.",
      editProfileNote: "Changes are saved directly to your merchant profile.",
      brandName: "Brand name",
      businessNamePlaceholder: "PT Red Feng Digital Nusantara",
      brandNamePlaceholder: "Red Feng",
      addressPlaceholder: "Main merchant operating address",
      city: "City",
      cityPlaceholder: "Semarang",
      province: "Province",
      provincePlaceholder: "Central Java",
      picName: "PIC name",
      picNamePlaceholder: "Merchant person in charge",
      picPosition: "PIC position",
      picPositionPlaceholder: "Founder / Director / Manager",
      ktpNumber: "ID card number",
      ktpNumberPlaceholder: "Person in charge ID number",
      description: "Description",
      descriptionUnavailable: "Not available in the current merchant schema yet.",
      contact: "Contact",
      bankAccountSection: "Bank Account",
      bankAccount: "Bank account",
      bankName: "Bank name",
      bankNamePlaceholder: "BCA / Mandiri / BNI / BRI",
      bankBranch: "Bank branch",
      bankBranchPlaceholder: "Payout bank branch",
      accountHolder: "Account holder",
      accountHolderPlaceholder: "Bank account holder name",
      accountNumber: "Account number",
      accountNumberPlaceholder: "Payout bank account number",
      taxIdentity: "Tax Identity",
      personalTaxId: "Personal tax ID",
      personalTaxIdPlaceholder: "Optional if available",
      companyTaxId: "Company tax ID",
      companyTaxIdPlaceholder: "Company tax ID number",
      nibNumber: "Business ID number",
      nibNumberPlaceholder: "Business registration number",
      editFormFooter: "Keep the business name, brand, and payout account aligned with the merchant's legal records.",
      saveChanges: "Save changes",
      notAvailable: "Not available",
    },
    zh: {
      profileEditorBadge: "Profile Editor",
      editProfile: "Edit merchant profile",
      editProfileHint: "Update business details, operating address, PIC, payout bank account, and tax identity directly from this page.",
      editProfileNote: "Changes are saved directly to your merchant profile.",
      businessNamePlaceholder: "PT Red Feng Digital Nusantara",
      brandNamePlaceholder: "Red Feng",
      addressPlaceholder: "Main merchant operating address",
      city: "City",
      cityPlaceholder: "Semarang",
      province: "Province",
      provincePlaceholder: "Central Java",
      picName: "PIC name",
      picNamePlaceholder: "Merchant person in charge",
      picPosition: "PIC position",
      picPositionPlaceholder: "Founder / Director / Manager",
      ktpNumber: "ID card number",
      ktpNumberPlaceholder: "Person in charge ID number",
      bankNamePlaceholder: "BCA / Mandiri / BNI / BRI",
      bankBranchPlaceholder: "Payout bank branch",
      accountHolderPlaceholder: "Bank account holder name",
      accountNumberPlaceholder: "Payout bank account number",
      personalTaxIdPlaceholder: "Optional if available",
      companyTaxIdPlaceholder: "Company tax ID number",
      nibNumber: "Business ID number",
      nibNumberPlaceholder: "Business registration number",
      editFormFooter: "Keep the business name, brand, and payout account aligned with the merchant's legal records.",
      saveChanges: "Save changes",
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
