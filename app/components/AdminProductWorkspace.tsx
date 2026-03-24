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
  preparedModules = ["Workspace", "Booking Center", "Operational queue", "Supplier / inventory"],
}: AdminProductWorkspaceProps) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f7f1e8_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-orange-200/60 bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_38%,#f97316_72%,#fdba74_100%)] px-8 py-10 text-white shadow-[0_30px_100px_rgba(146,64,14,0.18)] sm:px-10">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-50">
            {productLabel}
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Workspace admin untuk {productLabel}.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-orange-50/90">{description}</p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Workspace status</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{statusLabel}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Struktur submenu {productLabel} sudah disiapkan. Saat modul operasional produk ini mulai aktif,
              halaman ini bisa diisi queue review, supplier management, inventory, jadwal, dan aturan operasional
              khusus produk terkait.
            </p>
            {statusNote && <p className="mt-3 text-sm leading-7 text-slate-500">{statusNote}</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              {preparedModules.map((module) => (
                <span
                  key={module}
                  className="inline-flex rounded-full border border-[#ecd9c2] bg-[#fffaf3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600"
                >
                  {module}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-[#f3dbc3] bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-500">Quick actions</p>
            <div className="mt-5 flex flex-col gap-3">
              <Link
                href={primaryActionHref}
                className="inline-flex items-center justify-center rounded-[20px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {primaryActionLabel}
              </Link>
              {secondaryActionHref && secondaryActionLabel && (
                <Link
                  href={secondaryActionHref}
                  className="inline-flex items-center justify-center rounded-[20px] border border-[#ecd9c2] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-[#fff7ef] hover:text-orange-600"
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
