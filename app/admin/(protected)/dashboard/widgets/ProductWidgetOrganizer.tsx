"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ProductWidgetCatalogEntry } from "@/lib/admin-dashboard-widgets"

type OrganizerItem = {
  key: string
  label: string
  productLabel: string
  sectionTitle: string
  status: "connected" | "partial" | "roadmap"
}

function statusCopy(status: OrganizerItem["status"]) {
  if (status === "connected") return { label: "Terhubung", className: "bg-emerald-50 text-emerald-600" }
  if (status === "partial") return { label: "Sebagian", className: "bg-orange-50 text-orange-600" }
  return { label: "Roadmap", className: "bg-slate-100 text-slate-500" }
}

function sortOrganizerItems(
  items: OrganizerItem[],
  initialSortOrders: Record<string, number>,
) {
  return [...items].sort((a, b) => {
    const aOrder = initialSortOrders[a.key] ?? Number.MAX_SAFE_INTEGER
    const bOrder = initialSortOrders[b.key] ?? Number.MAX_SAFE_INTEGER
    return aOrder - bOrder || a.label.localeCompare(b.label)
  })
}

export default function ProductWidgetOrganizer({
  catalog,
  enabledKeys,
  initialSortOrders,
}: {
  catalog: ProductWidgetCatalogEntry[]
  enabledKeys: string[]
  initialSortOrders: Record<string, number>
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const catalogItems = useMemo(
    () =>
      catalog.flatMap((product) =>
        product.sections.flatMap((section) =>
          section.items.map((item) => ({
            key: item.key,
            label: item.label,
            productLabel: product.productLabel,
            sectionTitle: section.title,
            status: item.status,
          })),
        ),
      ),
    [catalog],
  )

  const [liveEnabledKeys, setLiveEnabledKeys] = useState(enabledKeys)
  const enabledItemMap = useMemo(() => {
    const enabledSet = new Set(liveEnabledKeys)
    return new Map(catalogItems.filter((item) => enabledSet.has(item.key)).map((item) => [item.key, item]))
  }, [catalogItems, liveEnabledKeys])

  const [orderedKeys, setOrderedKeys] = useState(() => {
    const entries = sortOrganizerItems(Array.from(enabledItemMap.values()), initialSortOrders)
    return entries.map((item) => item.key)
  })
  const [draggingKey, setDraggingKey] = useState<string | null>(null)

  useEffect(() => {
    setLiveEnabledKeys(enabledKeys)
  }, [enabledKeys])

  useEffect(() => {
    const form = rootRef.current?.closest("form")
    if (!form) return

    const syncEnabledKeys = () => {
      const formData = new FormData(form)
      setLiveEnabledKeys(formData.getAll("enabled_widget_keys").map((value) => String(value)))
    }

    syncEnabledKeys()
    form.addEventListener("change", syncEnabledKeys)
    return () => {
      form.removeEventListener("change", syncEnabledKeys)
    }
  }, [])

  useEffect(() => {
    const enabledEntries = sortOrganizerItems(Array.from(enabledItemMap.values()), initialSortOrders)
    const enabledKeySet = new Set(enabledEntries.map((item) => item.key))

    setOrderedKeys((current) => {
      const preserved = current.filter((key) => enabledKeySet.has(key))
      const missing = enabledEntries.map((item) => item.key).filter((key) => !preserved.includes(key))
      const next = [...preserved, ...missing]

      if (next.length === current.length && next.every((key, index) => key === current[index])) {
        return current
      }

      return next
    })
  }, [enabledItemMap, initialSortOrders])

  const hiddenSortOrderEntries = useMemo(
    () =>
      catalogItems.map((item) => {
        const orderedIndex = orderedKeys.indexOf(item.key)
        const fallbackOrder = initialSortOrders[item.key] ?? catalogItems.findIndex((entry) => entry.key === item.key)
        return [item.key, orderedIndex >= 0 ? orderedIndex : fallbackOrder] as const
      }),
    [catalogItems, initialSortOrders, orderedKeys],
  )

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    setOrderedKeys((current) => {
      if (fromIndex >= current.length || toIndex >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  return (
    <div ref={rootRef} className="space-y-5">
      {hiddenSortOrderEntries.map(([key, value]) => (
        <input key={key} type="hidden" name={`sort_order__${key}`} value={value} />
      ))}

      <div className="rounded-[24px] border border-[#dfe8f5] bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-[#dbe7fb] bg-[#f7fbff] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-sky-700">
              Product Order
            </span>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Urutan Widget Produk Aktif</h3>
            <p className="mt-2 text-[15px] leading-7 text-slate-500">
              Geser kartu untuk mengubah urutan tampil di dashboard. Tombol naik dan turun tetap tersedia kalau lebih nyaman.
            </p>
          </div>
          <div className="rounded-[18px] border border-[#e3ebf7] bg-[#fcfdff] px-4 py-3 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Siap diurutkan</p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{orderedKeys.length}</p>
          </div>
        </div>

        {orderedKeys.length > 0 ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {orderedKeys.map((key, index) => {
              const item = enabledItemMap.get(key)
              if (!item) return null
              const status = statusCopy(item.status)
              return (
                <div
                  key={item.key}
                  draggable
                  onDragStart={() => setDraggingKey(item.key)}
                  onDragEnd={() => setDraggingKey(null)}
                  onDragOver={(event) => {
                    event.preventDefault()
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    const fromIndex = draggingKey ? orderedKeys.indexOf(draggingKey) : -1
                    moveItem(fromIndex, index)
                    setDraggingKey(null)
                  }}
                  className={`rounded-[20px] border bg-[#fffdfa] p-5 transition ${
                    draggingKey === item.key
                      ? "border-sky-300 shadow-[0_16px_30px_rgba(14,165,233,0.14)]"
                      : "border-[#e5ebf4] hover:border-sky-200 hover:bg-sky-50/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        #{index + 1} - {item.productLabel}
                      </p>
                      <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-slate-900">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{item.sectionTitle}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#e5ebf4] pt-4">
                    <span className="text-xs font-medium text-slate-400">Seret untuk memindahkan</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveItem(index, index - 1)}
                        disabled={index === 0}
                        className="rounded-[12px] border border-[#dce6f5] bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Naik
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, index + 1)}
                        disabled={index === orderedKeys.length - 1}
                        className="rounded-[12px] border border-[#dce6f5] bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Turun
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-[20px] border border-dashed border-[#dce6f5] bg-[#fcfdff] px-6 py-10 text-center">
            <p className="text-lg font-semibold tracking-[-0.02em] text-slate-900">Belum ada widget produk aktif</p>
            <p className="mt-2 text-[15px] leading-7 text-slate-500">
              Centang widget produk di katalog bawah, lalu kembali ke area ini untuk mengatur urutannya.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
