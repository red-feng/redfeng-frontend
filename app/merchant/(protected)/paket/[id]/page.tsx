import Link from "next/link"
import { notFound } from "next/navigation"
import { normalizeLocale, type Locale } from "@/lib/i18n"
import { getCurrentLocale } from "@/lib/locale"
import { createClient } from "@/lib/supabase/server"

type MerchantPackageDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ room_id?: string; portal?: string }>
}

type PackageRow = {
  id: string
  title: string | null
  status: string | null
  travel_style: string | null
  price_adult: number | null
  created_at: string | null
  updated_at: string | null
}

function getCopy(locale: Locale) {
  if (locale === "en") {
    return {
      title: "Merchant Package Detail",
      subtitle: "Private merchant view. Separate from customer package detail.",
      packageId: "Package ID",
      packageTitle: "Package Name",
      packageStatus: "Status",
      travelStyle: "Travel style",
      priceAdult: "Adult price",
      createdAt: "Created",
      updatedAt: "Last updated",
      backToList: "Back to package list",
      editPackage: "Edit package",
      openMerchantChat: "Open merchant chat",
      notFound: "Package not found or no longer belongs to this merchant.",
    }
  }
  if (locale === "zh") {
    return {
      title: "商家套餐详情",
      subtitle: "仅商家可见，与客户套餐详情页面完全分离。",
      packageId: "套餐 ID",
      packageTitle: "套餐名称",
      packageStatus: "状态",
      travelStyle: "旅行风格",
      priceAdult: "成人价格",
      createdAt: "创建时间",
      updatedAt: "最后更新",
      backToList: "返回套餐列表",
      editPackage: "编辑套餐",
      openMerchantChat: "打开商家聊天",
      notFound: "未找到套餐，或该套餐已不属于当前商家。",
    }
  }
  return {
    title: "Detail Paket Merchant",
    subtitle: "Tampilan khusus merchant. Terpisah penuh dari detail paket customer.",
    packageId: "ID Paket",
    packageTitle: "Nama Paket",
    packageStatus: "Status",
    travelStyle: "Travel style",
    priceAdult: "Harga dewasa",
    createdAt: "Dibuat",
    updatedAt: "Update terakhir",
    backToList: "Kembali ke daftar paket",
    editPackage: "Edit paket",
    openMerchantChat: "Buka chat merchant",
    notFound: "Paket tidak ditemukan atau bukan milik merchant ini.",
  }
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const lang = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "id-ID"
  return date.toLocaleDateString(lang, { day: "2-digit", month: "long", year: "numeric" })
}

function formatPrice(value: number | null) {
  return `Rp ${(value ?? 0).toLocaleString("id-ID")}`
}

export const dynamic = "force-dynamic"

export default async function MerchantPackageDetailPage({ params, searchParams }: MerchantPackageDetailPageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const locale = normalizeLocale(await getCurrentLocale())
  const copy = getCopy(locale)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: merchant } = await supabase.from("merchants").select("id").eq("user_id", user.id).maybeSingle()
  if (!merchant?.id) notFound()

  const { data: pkg } = await supabase
    .from("packages")
    .select("id, title, status, travel_style, price_adult, created_at, updated_at")
    .eq("id", id)
    .eq("merchant_id", merchant.id)
    .maybeSingle<PackageRow>()

  if (!pkg) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{copy.notFound}</div>
      </main>
    )
  }

  const chatSearch = new URLSearchParams()
  chatSearch.set("package_id", pkg.id)
  chatSearch.set("portal", "merchant")
  if (sp.room_id) chatSearch.set("room_id", sp.room_id)
  const merchantChatHref = `/merchant/chat?${chatSearch.toString()}`

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_38%,#f3eee7_100%)] p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[28px] bg-[linear-gradient(135deg,#9a3412_0%,#ea580c_48%,#fb923c_100%)] p-6 text-white shadow-[0_22px_60px_-36px_rgba(154,52,18,0.9)] md:p-8">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">{copy.title}</h1>
          <p className="mt-2 text-sm text-orange-50/95">{copy.subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/merchant/paket" className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              {copy.backToList}
            </Link>
            <Link href={`/merchant/paket/${encodeURIComponent(pkg.id)}/edit`} className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              {copy.editPackage}
            </Link>
            <Link href={merchantChatHref} className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              {copy.openMerchantChat}
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-orange-100 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{copy.packageId}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{pkg.id}</p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{copy.packageTitle}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{pkg.title || "-"}</p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{copy.packageStatus}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{pkg.status || "-"}</p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{copy.travelStyle}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{pkg.travel_style || "-"}</p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{copy.priceAdult}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{formatPrice(pkg.price_adult)}</p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{copy.createdAt}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(pkg.created_at, locale)}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">{copy.updatedAt}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(pkg.updated_at, locale)}</p>
          </div>
        </section>
      </div>
    </main>
  )
}
