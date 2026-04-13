"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { toneClass } from "@/lib/status-tones"
import {
  approvePackage,
  bulkApprovePackages,
  bulkDeletePackages,
  bulkRejectPackages,
  deletePackage,
  rejectPackage,
} from "../../packages/actions"

type PackageRow = {
  id: string
  title: string | null
  status: string | null
  currency: string | null
  price_adult: number | null
  created_at: string | null
  reviewed_at: string | null
  rejection_reason: string | null
}

function statusTone(status: string | null) {
  if (status === "approved") return toneClass("success", "bordered")
  if (status === "pending") return toneClass("pending", "bordered")
  if (status === "rejected") return toneClass("danger", "bordered")
  if (status === "draft") return toneClass("progress", "bordered")
  if (status === "inactive") return toneClass("neutral", "bordered")
  return toneClass("neutral", "bordered")
}

function statusLabel(status: string | null) {
  if (status === "approved") return "Approved"
  if (status === "pending") return "Pending Review"
  if (status === "rejected") return "Rejected"
  if (status === "draft") return "Draft"
  if (status === "inactive") return "Inactive"
  return status || "Unknown"
}

function formatMoney(value: number | null, currency: string | null) {
  return `${currency || "IDR"} ${(value || 0).toLocaleString("id-ID")}`
}

function formatDate(value: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
}

export default function AdminMerchantPackageBulkClient({
  packages,
  readOnly = false,
}: {
  packages: PackageRow[]
  readOnly?: boolean
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const allIds = useMemo(() => packages.map((pkg) => pkg.id), [packages])
  const allSelected = allIds.length > 0 && selectedIds.length === allIds.length

  function togglePackage(packageId: string) {
    setSelectedIds((current) =>
      current.includes(packageId) ? current.filter((id) => id !== packageId) : [...current, packageId],
    )
  }

  function selectAll() {
    setSelectedIds(allIds)
  }

  function clearSelection() {
    setSelectedIds([])
  }

  return (
    <div className="space-y-4">
      <form id="bulk-package-actions" className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4 sm:rounded-[24px]">
        {selectedIds.map((packageId) => (
          <input key={packageId} type="hidden" name="packageIds" value={packageId} />
        ))}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Bulk action</p>
            <p className="mt-2 text-sm text-slate-700">
              Centang beberapa paket dalam merchant ini lalu jalankan aksi massal agar admin tidak perlu memproses satu per satu.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Pilihan hanya berlaku untuk paket yang sedang tampil pada tab dan hasil filter saat ini.
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            {selectedIds.length} dari {packages.length} paket pada tab ini terpilih
          </div>
        </div>

        {readOnly ? (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-700">
            Operations Manager dapat memonitor pilihan bulk dan kesehatan antrean paket merchant, tetapi eksekusi bulk review tetap dijalankan admin operasional.
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={selectAll}
                disabled={!packages.length || allSelected}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Pilih semua
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={!selectedIds.length}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Kosongkan
              </button>
            </div>

            <textarea
              name="reason"
              placeholder="Alasan revisi untuk bulk reject"
              className="mt-4 h-24 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none ring-orange-500 transition focus:ring-2"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                formAction={bulkApprovePackages}
                disabled={!selectedIds.length}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Setujui
              </button>
              <button
                formAction={bulkRejectPackages}
                disabled={!selectedIds.length}
                className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tolak
              </button>
              <button
                formAction={bulkDeletePackages}
                disabled={!selectedIds.length}
                onClick={(event) => {
                  if (!window.confirm("Yakin ingin menghapus permanen semua paket terpilih dari database? Tindakan ini tidak bisa dibatalkan.")) {
                    event.preventDefault()
                  }
                }}
                className="rounded-xl border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hapus
              </button>
            </div>
          </>
        )}
      </form>

      {packages.map((pkg) => {
        const isSelected = selectedIds.includes(pkg.id)
        return (
          <div
            key={pkg.id}
            className={`grid gap-4 rounded-[20px] border bg-white p-4 shadow-sm transition sm:gap-5 sm:rounded-[24px] sm:p-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)] ${
              isSelected ? "border-orange-300 shadow-[0_16px_40px_rgba(249,115,22,0.16)]" : "border-slate-200"
            }`}
          >
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePackage(pkg.id)}
                    disabled={readOnly}
                    className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                  />
                  Pilih paket
                </label>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(pkg.status)}`}>
                  {statusLabel(pkg.status)}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  Package ID: {pkg.id}
                </span>
              </div>

              <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{pkg.title || "Tanpa judul"}</h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Harga Dewasa</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{formatMoney(pkg.price_adult, pkg.currency)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Dibuat</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(pkg.created_at)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Direview</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{formatDate(pkg.reviewed_at)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Catatan</p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-700">{pkg.rejection_reason || "Belum ada catatan."}</p>
                </div>
              </div>
            </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <Link
                href={`/admin/packages/${pkg.id}`}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-orange-300 hover:text-orange-600"
              >
                Detail
              </Link>

              {readOnly ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-700">
                  Operations Manager hanya membaca detail paket merchant ini. Aksi review tetap dijalankan admin operasional.
                </div>
              ) : (
                <>
                  <form action={approvePackage}>
                    <input type="hidden" name="packageId" value={pkg.id} />
                    <button className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                      Setujui
                    </button>
                  </form>

                  <form action={rejectPackage} className="space-y-3">
                    <input type="hidden" name="packageId" value={pkg.id} />
                    <textarea
                      name="reason"
                      placeholder="Alasan penolakan atau revisi paket"
                      required
                      className="h-20 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none ring-orange-500 transition focus:ring-2 sm:h-24"
                    />
                    <button className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700">
                      Tolak
                    </button>
                  </form>

                  <form action={deletePackage}>
                    <input type="hidden" name="packageId" value={pkg.id} />
                    <button
                      onClick={(event) => {
                        if (!window.confirm("Yakin ingin menghapus permanen paket ini dari database? Tindakan ini tidak bisa dibatalkan.")) {
                          event.preventDefault()
                        }
                      }}
                      className="w-full rounded-xl border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Hapus
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
