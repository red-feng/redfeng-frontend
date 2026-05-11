import SimplePublicLogoHeader from "@/app/components/SimplePublicLogoHeader"

export default function CheckoutLoading() {
  return (
    <>
      <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
        <SimplePublicLogoHeader />
      </div>
      <main className="min-h-screen animate-public-page-in bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-4 pb-32 pt-4 sm:p-6 md:p-10">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-6 md:p-8">
          <div className="loading-shimmer h-3 w-24 rounded-full" />
          <div className="loading-shimmer mt-4 h-9 w-3/4 rounded-[24px]" />
          <div className="loading-shimmer mt-3 h-4 w-2/3 rounded-full" />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index}>
                <div className="loading-shimmer mb-2 h-4 w-24 rounded-full" />
                <div className="loading-shimmer h-12 rounded-2xl" />
              </div>
            ))}
          </div>

          <div className="loading-shimmer mt-4 h-20 rounded-2xl" />
          <div className="loading-shimmer mt-4 h-16 rounded-2xl" />

          <div className="mt-6 space-y-3">
            <div className="loading-shimmer h-4 w-28 rounded-full" />
            <div className="loading-shimmer h-24 rounded-2xl" />
            <div className="loading-shimmer h-24 rounded-2xl" />
          </div>

          <div className="mt-6 space-y-3">
            <div className="loading-shimmer h-4 w-32 rounded-full" />
            <div className="loading-shimmer h-20 rounded-2xl" />
            <div className="loading-shimmer h-20 rounded-2xl" />
            <div className="loading-shimmer h-20 rounded-2xl" />
          </div>
        </section>

        <aside className="space-y-6">
          <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm sm:rounded-[28px]">
            <div className="loading-shimmer h-48 sm:h-56" />
            <div className="p-4 sm:p-6">
              <div className="loading-shimmer h-7 w-40 rounded-2xl" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="loading-shimmer h-4 rounded-full" />
                ))}
              </div>
              <div className="loading-shimmer mt-6 h-12 rounded-2xl" />
            </div>
          </section>
        </aside>
        </div>
      </main>
    </>
  )
}
