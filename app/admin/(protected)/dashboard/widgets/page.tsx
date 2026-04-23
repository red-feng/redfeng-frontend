import Link from "next/link"
import { redirect } from "next/navigation"
import {
  OPERATIONS_DASHBOARD_SCOPE,
  OPERATIONS_DASHBOARD_WIDGETS,
  OPERATIONS_PRODUCT_WIDGET_CATALOG,
  resolveOperationsDashboardWidgetKeys,
} from "@/lib/admin-dashboard-widgets"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { resetOperationsDashboardWidgets, saveOperationsDashboardWidgets } from "../actions"

export const dynamic = "force-dynamic"

function statusCopy(status: string) {
  if (status === "connected") return { label: "Terhubung", className: "bg-emerald-50 text-emerald-600" }
  if (status === "partial") return { label: "Sebagian", className: "bg-orange-50 text-orange-600" }
  return { label: "Roadmap", className: "bg-slate-100 text-slate-500" }
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
  const preferenceResult = await adminSupabase
    .from("dashboard_widget_preferences")
    .select("widget_key, enabled")
    .eq("profile_id", user.id)
    .eq("dashboard_scope", OPERATIONS_DASHBOARD_SCOPE)
    .order("sort_order", { ascending: true })
  const enabledWidgetKeys = resolveOperationsDashboardWidgetKeys(
    preferenceResult.error ? null : ((preferenceResult.data as Array<{ widget_key: string | null; enabled: boolean | null }> | null) || []),
  )
  const coreActiveCount = OPERATIONS_DASHBOARD_WIDGETS.filter((widget) => enabledWidgetKeys.has(widget.key)).length
  const roadmapActiveCount = OPERATIONS_PRODUCT_WIDGET_CATALOG.reduce(
    (total, product) =>
      total +
      product.sections.reduce(
        (sectionTotal, section) => sectionTotal + section.items.filter((item) => enabledWidgetKeys.has(item.key)).length,
        0,
      ),
    0,
  )
  const activeCount = coreActiveCount + roadmapActiveCount

  return (
    <main className="min-h-screen bg-[#fbfaf8] px-4 py-6 sm:px-6 lg:px-9">
      <div className="mx-auto max-w-[1280px] space-y-6">
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

        <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-[#f0d8c3] bg-[#fff7ef] px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-orange-600">
              Dashboard Widgets
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Kelola Widget Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Pilih widget yang ingin ditampilkan di dashboard utama Manager Operasional. Semua widget boleh dimatikan; dashboard akan menampilkan empty state.
            </p>
          </div>
          <div className="rounded-[18px] border border-[#eee3d9] bg-white px-5 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Widget aktif</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{activeCount}</p>
            <p className="mt-1 text-xs text-slate-500">{coreActiveCount} live widget + {roadmapActiveCount} roadmap widget</p>
          </div>
        </section>

        <form action={saveOperationsDashboardWidgets} className="space-y-5">
          <input type="hidden" name="return_to" value="/admin/dashboard/widgets" />
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {OPERATIONS_DASHBOARD_WIDGETS.map((widget) => {
              const status = statusCopy(widget.status)
              return (
                <label
                  key={widget.key}
                  className="group rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)] transition hover:border-orange-200 hover:bg-orange-50/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{widget.title}</p>
                      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{widget.description}</p>
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
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{widget.key.replace(/_/g, " ")}</span>
                  </div>
                </label>
              )
            })}
          </section>

          <section className="space-y-4">
          <div>
            <span className="inline-flex rounded-full border border-[#e8ddcf] bg-white px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Product Catalog
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Master Widget per Produk</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Berikut blueprint widget per produk yang nanti bisa diaktifkan saat modul dan data backend-nya sudah siap. Ini membantu kita menjaga struktur dashboard tetap konsisten saat Pesawat, Hotel, Kereta, Bus, Kapal Laut, dan Kapal Pesiar mulai live.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {OPERATIONS_PRODUCT_WIDGET_CATALOG.map((product) => {
              const status = statusCopy(product.status)
              return (
                <Link
                  key={product.productLabel}
                  href={product.productHref}
                  className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)] transition hover:border-orange-200 hover:bg-orange-50/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{product.productLabel}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{product.note}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {product.sections.map((section) => (
                      <div key={section.title} className="rounded-[16px] border border-[#f0e6dd] bg-[#fffdfa] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">{section.title}</p>
                        <div className="mt-3 space-y-2">
                          {section.items.map((item) => {
                            const itemStatus = statusCopy(item.status)
                            return (
                              <label key={item.key} className="flex items-start justify-between gap-3 rounded-[12px] border border-transparent px-2 py-2 transition hover:border-orange-100 hover:bg-white">
                                <div>
                                  <p className="text-sm leading-5 text-slate-700">{item.label}</p>
                                  <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${itemStatus.className}`}>{itemStatus.label}</span>
                                </div>
                                <input
                                  type="checkbox"
                                  name="enabled_widget_keys"
                                  value={item.key}
                                  defaultChecked={enabledWidgetKeys.has(item.key)}
                                  className="mt-1 h-4 w-4 rounded border-[#e6d5c5] text-orange-600 focus:ring-orange-500"
                                />
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </Link>
              )
            })}
          </div>
          </section>

          <div className="flex flex-col gap-3 rounded-[20px] border border-[#eee3d9] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-500">
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
