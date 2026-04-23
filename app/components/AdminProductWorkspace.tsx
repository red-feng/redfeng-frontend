import Link from "next/link"

type AdminProductWorkspaceProps = {
  productLabel: string
  description: string
  statusLabel?: string
  statusNote?: string
  primaryActionHref: string
  primaryActionLabel: string
  secondaryActionHref?: string
  secondaryActionLabel?: string
  preparedModules?: string[]
}

export default function AdminProductWorkspace({
  productLabel,
  description,
  statusLabel = "Segera aktif",
  statusNote,
  primaryActionHref,
  primaryActionLabel,
  secondaryActionHref,
  secondaryActionLabel,
  preparedModules = ["Workspace", "Booking shortcut", "Operational queue", "Supplier / inventory"],
}: AdminProductWorkspaceProps) {
  const futureKpis = [
    { label: "Total Booking", value: "-", note: "Aktif saat modul booking tersedia.", tone: "text-sky-600", bg: "bg-sky-50" },
    { label: "Revenue", value: "-", note: "Menunggu transaksi produk live.", tone: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Pending Review", value: "-", note: "Queue operasional belum terhubung.", tone: "text-orange-600", bg: "bg-orange-50" },
    { label: "Anomali", value: "-", note: "Monitoring akan aktif setelah data masuk.", tone: "text-rose-600", bg: "bg-rose-50" },
  ]
  const operationalPillars = [
    "Supplier / vendor",
    "Inventory & jadwal",
    "Booking center",
    "Refund / reschedule",
    "Audit operasional",
  ]

  return (
    <main className="min-h-screen bg-[#fbfaf8] px-4 py-6 sm:px-6 lg:px-9">
      <div className="mx-auto max-w-[1680px] space-y-6">
        <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-[#f0d8c3] bg-[#fff7ef] px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-orange-600">
              Product Dashboard
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
              Dashboard {productLabel}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
          </div>
          <div className="rounded-[18px] border border-[#eee3d9] bg-white px-5 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-500">Status</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{statusLabel}</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{statusNote || "Dashboard sudah disiapkan, tetapi data operasional produk ini belum tersambung."}</p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {futureKpis.map((card) => (
            <div key={card.label} className="rounded-[18px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
              <div className="flex items-start gap-3">
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${card.bg} ${card.tone}`}>{card.label[0]}</span>
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{card.value}</p>
                  <p className="mt-3 text-xs leading-5 text-slate-400">{card.note}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="grid items-start gap-5 xl:grid-cols-[1fr_1fr_0.8fr]">
          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-950">Pipeline Operasional</h2>
              <span className="rounded-[12px] border border-[#eadfd5] px-3 py-1 text-xs text-slate-500">Belum terhubung</span>
            </div>
            <div className="mt-5 space-y-3">
              {operationalPillars.map((pillar) => (
                <div key={pillar} className="flex items-center justify-between rounded-[16px] border border-[#f0e6dd] bg-[#fffdfa] p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{pillar}</p>
                    <p className="mt-1 text-xs text-slate-500">Slot dashboard sudah disiapkan untuk modul {productLabel}.</p>
                  </div>
                  <span className="rounded-[10px] bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">Soon</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-950">Modul Disiapkan</h2>
              <span className="rounded-[12px] border border-[#eadfd5] px-3 py-1 text-xs text-slate-500">Roadmap</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {preparedModules.map((module) => (
                <span key={module} className="inline-flex rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {module}
                </span>
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              Saat modul {productLabel} aktif, halaman ini bisa langsung diisi data booking, supplier, inventory,
              rute/jadwal, refund, dan anomali khusus produk tanpa mengubah dashboard utama.
            </p>
          </div>

          <div className="rounded-[20px] border border-[#eee3d9] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-slate-950">Quick Actions</h2>
            <div className="mt-5 grid gap-3">
              <Link
                href={primaryActionHref}
                className="inline-flex items-center justify-center rounded-[16px] bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
              >
                {primaryActionLabel}
              </Link>
              {secondaryActionHref && secondaryActionLabel && (
                <Link
                  href={secondaryActionHref}
                  className="inline-flex items-center justify-center rounded-[16px] border border-[#ecd9c2] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
                >
                  {secondaryActionLabel}
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
