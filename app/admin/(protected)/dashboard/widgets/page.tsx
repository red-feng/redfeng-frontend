import Link from "next/link"
import { redirect } from "next/navigation"
import {
  OPERATIONS_DASHBOARD_SCOPE,
  OPERATIONS_DASHBOARD_WIDGETS,
  OPERATIONS_PRODUCT_WIDGET_CATALOG,
  resolveOperationsDashboardWidgetKeys,
} from "@/lib/admin-dashboard-widgets"
import { getAccessibleInternalProducts, getAccessibleInternalProductTypes } from "@/lib/internal-product-access"
import { normalizeBookingProductType } from "@/lib/booking-products"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { resetOperationsDashboardWidgets, saveOperationsDashboardWidgets } from "../actions"
import ProductWidgetOrganizer from "./ProductWidgetOrganizer"

export const dynamic = "force-dynamic"

function statusCopy(status: string) {
  if (status === "connected") return { label: "Terhubung", className: "bg-emerald-50 text-emerald-600" }
  if (status === "partial") return { label: "Sebagian", className: "bg-orange-50 text-orange-600" }
  return { label: "Roadmap", className: "bg-slate-100 text-slate-500" }
}

function scopeCopy(scope: "global_only" | "product_only" | "hybrid") {
  if (scope === "global_only") return { label: "Global Only", className: "bg-slate-900 text-white" }
  if (scope === "hybrid") return { label: "Hybrid", className: "bg-violet-50 text-violet-700" }
  return { label: "Product Only", className: "bg-sky-50 text-sky-700" }
}

function getProductTypeFromWidgetCatalogLabel(label: string) {
  return normalizeBookingProductType(
    label === "Paket Wisata"
      ? "package_tour"
      : label === "Pesawat"
        ? "flight"
        : label === "Hotel"
          ? "hotel"
          : label === "Kereta Api"
            ? "train"
            : label === "Bus & Travel"
              ? "bus"
              : label === "Kapal Laut"
                ? "sea"
                : label === "Kapal Pesiar"
                  ? "cruise"
                  : null,
  )
}

export default async function OperationsDashboardWidgetsPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>
}) {
  const params = (await searchParams) || {}
  const supabase = await createClient("admin")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["operations_manager", "superadmin"].includes(profile.role || "")) {
    redirect("/admin/dashboard?error=Hanya operations manager atau superadmin yang dapat mengatur widget dashboard.")
  }

  const adminSupabase = createAdminClient()
  const accessibleProducts = await getAccessibleInternalProducts(adminSupabase, user.id, profile.role)
  const accessibleProductTypes = getAccessibleInternalProductTypes(accessibleProducts)
  const preferenceResult = await adminSupabase
    .from("dashboard_widget_preferences")
    .select("widget_key, enabled, sort_order")
    .eq("profile_id", user.id)
    .eq("dashboard_scope", OPERATIONS_DASHBOARD_SCOPE)
    .order("sort_order", { ascending: true })
  const preferenceRows =
    preferenceResult.error
      ? null
      : ((preferenceResult.data as Array<{ widget_key: string | null; enabled: boolean | null; sort_order: number | null }> | null) || [])
  const enabledWidgetKeys = resolveOperationsDashboardWidgetKeys(
    preferenceRows,
  )
  const sortOrderMap = new Map(
    (preferenceRows || []).map((row, index) => [String(row.widget_key || ""), Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : index]),
  )
  const coreActiveCount = OPERATIONS_DASHBOARD_WIDGETS.filter((widget) => enabledWidgetKeys.has(widget.key)).length
  const visibleProductWidgetCatalog = OPERATIONS_PRODUCT_WIDGET_CATALOG.filter((product) => {
    const productType = getProductTypeFromWidgetCatalogLabel(product.productLabel)
    return productType ? accessibleProductTypes.includes(productType) : false
  })
  const productActiveCount = visibleProductWidgetCatalog.reduce(
    (total, product) =>
      total +
      product.sections.reduce(
        (sectionTotal, section) => sectionTotal + section.items.filter((item) => enabledWidgetKeys.has(item.key)).length,
        0,
      ),
    0,
  )
  const activeProductRoadmapCount = visibleProductWidgetCatalog.reduce(
    (total, product) =>
      total +
      product.sections.reduce(
        (sectionTotal, section) =>
          sectionTotal + section.items.filter((item) => enabledWidgetKeys.has(item.key) && item.status === "roadmap").length,
        0,
      ),
    0,
  )
  const activeProductConnectedCount = productActiveCount - activeProductRoadmapCount
  const activeCount = coreActiveCount + productActiveCount
  const productSortOrders = Object.fromEntries(
    visibleProductWidgetCatalog.flatMap((product, productIndex) =>
      product.sections.flatMap((section, sectionIndex) =>
        section.items.map((item, itemIndex) => [
          item.key,
          sortOrderMap.get(item.key) ?? productIndex * 100 + sectionIndex * 20 + itemIndex,
        ]),
      ),
    ),
  )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff4e9,transparent_28%),radial-gradient(circle_at_top_right,#eef6ff,transparent_26%),#fbfaf8] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1340px] space-y-8">
        {params.success ? (
          <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
            {params.success}
          </div>
        ) : null}
        {params.error ? (
          <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
            {params.error}
          </div>
        ) : null}

        <section className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-[#f0d8c3] bg-white/90 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.34em] text-orange-600 shadow-[0_10px_24px_rgba(249,115,22,0.08)]">
              Dashboard Widgets
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl">Kelola Widget Dashboard</h1>
            <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-500">
              Pilih widget global yang ingin ditampilkan di dashboard utama Manager Operasional. Semua widget boleh dimatikan; dashboard akan menampilkan empty state.
            </p>
            <p className="mt-2 max-w-3xl text-[15px] leading-7 text-slate-500">
              Widget produk di bawah hanya menampilkan katalog untuk produk yang memang bisa Anda akses, supaya konfigurasi yang diaktifkan selalu relevan dengan dashboard utama.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {[
                {
                  label: "Global Only",
                  tone: "bg-slate-900 text-white",
                  note: "Hanya muncul di dashboard utama lintas produk.",
                },
                {
                  label: "Product Only",
                  tone: "bg-sky-50 text-sky-700",
                  note: "Khusus untuk widget detail di workspace produk.",
                },
                {
                  label: "Hybrid",
                  tone: "bg-violet-50 text-violet-700",
                  note: "Bisa punya versi global dan versi per produk.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[18px] border border-[#e7ebf3] bg-white/90 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                >
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${item.tone}`}>{item.label}</span>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[22px] border border-[#eee3d9] bg-white/95 px-6 py-5 shadow-[0_18px_38px_rgba(15,23,42,0.06)] backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Widget aktif</p>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">{activeCount}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {coreActiveCount} widget global + {activeProductConnectedCount} widget produk aktif + {activeProductRoadmapCount} widget roadmap
            </p>
          </div>
        </section>

        <form action={saveOperationsDashboardWidgets} className="space-y-7">
          <input type="hidden" name="return_to" value="/admin/dashboard/widgets" />
          <section className="rounded-[28px] border border-[#f0e2d4] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] p-6 shadow-[0_22px_48px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-4 border-b border-[#f2e5d9] pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-[#f0d8c3] bg-white px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-600">
                  Widget Global
                </span>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Ringkasan Lintas Produk</h2>
                <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-500">
                  Bagian ini hanya berisi widget yang sifatnya dashboard-level dan tidak digantikan oleh katalog widget per produk.
                </p>
              </div>
              <div className="rounded-[20px] border border-[#eadfd5] bg-white px-5 py-4 text-right shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Global aktif</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{coreActiveCount}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {OPERATIONS_DASHBOARD_WIDGETS.map((widget) => {
                const status = statusCopy(widget.status)
                return (
                  <label
                    key={widget.key}
                    className="group rounded-[22px] border border-[#eee3d9] bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-[0_18px_32px_rgba(249,115,22,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{widget.title}</p>
                        <p className="mt-3 min-h-[84px] text-[15px] leading-7 text-slate-500">{widget.description}</p>
                        <p className="mt-3 text-sm leading-6 text-slate-400">{widget.scopeNote}</p>
                      </div>
                      <input
                        type="checkbox"
                        name="enabled_widget_keys"
                        value={widget.key}
                        defaultChecked={enabledWidgetKeys.has(widget.key)}
                        className="mt-1 h-5 w-5 rounded border-[#e6d5c5] text-orange-600 focus:ring-orange-500"
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${scopeCopy(widget.scope).className}`}>
                          {scopeCopy(widget.scope).label}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{widget.key.replace(/_/g, " ")}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#e7ebf3] bg-[linear-gradient(180deg,#f9fbff_0%,#ffffff_100%)] p-6 shadow-[0_22px_48px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-4 border-b border-[#e8edf4] pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-[#dbe7fb] bg-white px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-700">
                  Widget Produk
                </span>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Master Widget per Produk</h2>
                <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-500">
                  Widget operasional yang spesifik per produk dikumpulkan di sini supaya tidak bertabrakan dengan widget global. Katalog ini otomatis mengikuti akses produk user dan menjadi fondasi saat modul baru mulai live.
                </p>
              </div>
              <div className="rounded-[20px] border border-[#dfe8f5] bg-white px-5 py-4 text-right shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Produk aktif</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{productActiveCount}</p>
              </div>
            </div>

            <div className="mt-6">
              <ProductWidgetOrganizer
                catalog={visibleProductWidgetCatalog}
                enabledKeys={Array.from(enabledWidgetKeys)}
                initialSortOrders={productSortOrders}
              />
            </div>

            {visibleProductWidgetCatalog.length === 0 ? (
              <div className="mt-6 rounded-[22px] border border-dashed border-[#dfe8f5] bg-[#fcfdff] px-6 py-10 text-center">
                <p className="text-lg font-semibold tracking-[-0.02em] text-slate-900">Belum ada katalog widget produk yang bisa diakses</p>
                <p className="mt-2 text-[15px] leading-7 text-slate-500">
                  Saat akses produk ditambahkan ke akun ini, widget produk yang relevan akan otomatis muncul di area ini.
                </p>
              </div>
            ) : null}

            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              {visibleProductWidgetCatalog.map((product) => {
                const status = statusCopy(product.status)
                return (
                  <div
                    key={product.productLabel}
                    className="rounded-[22px] border border-[#e4eaf3] bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/20 hover:shadow-[0_18px_32px_rgba(14,165,233,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{product.productLabel}</p>
                        <p className="mt-3 text-[15px] leading-7 text-slate-500">{product.note}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                        <Link href={product.productHref} className="text-xs font-semibold text-sky-700">
                          Buka workspace
                        </Link>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      {product.sections.map((section) => (
                        <div key={section.title} className="rounded-[18px] border border-[#e8edf4] bg-[#fcfdff] p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">{section.title}</p>
                          <div className="mt-4 space-y-2.5">
                            {section.items.map((item) => {
                              const itemStatus = statusCopy(item.status)
                              const itemScope = scopeCopy(item.scope)
                              return (
                                <label key={item.key} className="flex items-start justify-between gap-3 rounded-[14px] border border-transparent px-3 py-2.5 transition hover:border-sky-100 hover:bg-white">
                                  <div>
                                    <p className="text-sm font-medium leading-6 text-slate-700">{item.label}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${itemStatus.className}`}>{itemStatus.label}</span>
                                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${itemScope.className}`}>{itemScope.label}</span>
                                    </div>
                                    <p className="mt-2 text-xs leading-5 text-slate-400">{item.scopeNote}</p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    name="enabled_widget_keys"
                                    value={item.key}
                                    defaultChecked={enabledWidgetKeys.has(item.key)}
                                    className="mt-1 h-4 w-4 rounded border-[#d3dfef] text-sky-600 focus:ring-sky-500"
                                  />
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <div className="flex flex-col gap-4 rounded-[24px] border border-[#eee3d9] bg-white p-5 shadow-[0_18px_38px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] leading-7 text-slate-500">
              Simpan perubahan untuk mengatur dashboard utama. Jika semua widget dimatikan, dashboard akan kosong dengan tombol kelola widget.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/dashboard" className="inline-flex items-center justify-center rounded-[14px] border border-[#eadfd5] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600">
                Lihat Dashboard
              </Link>
              <button className="inline-flex items-center justify-center rounded-[14px] bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700">
                Simpan Widget
              </button>
            </div>
          </div>
        </form>

        <form action={resetOperationsDashboardWidgets}>
          <input type="hidden" name="return_to" value="/admin/dashboard/widgets" />
          <button className="inline-flex rounded-[14px] border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
            Reset ke Default
          </button>
        </form>
      </div>
    </main>
  )
}
