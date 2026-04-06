export default function PackageDetailLoading() {
  return (
    <main className="min-h-screen animate-public-page-in bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#fffaf5_100%)] px-4 py-5 pb-32 sm:px-5 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_28px_80px_rgba(15,23,42,0.08)] sm:rounded-[28px] md:rounded-[32px]">
          <div className="loading-shimmer h-3 w-28 rounded-full" />
          <div className="loading-shimmer mt-4 h-10 w-3/4 rounded-[24px]" />
          <div className="loading-shimmer mt-3 h-4 w-2/3 rounded-full" />
          <div className="mt-5 flex flex-wrap gap-2">
            <div className="loading-shimmer h-8 w-28 rounded-full" />
            <div className="loading-shimmer h-8 w-24 rounded-full" />
            <div className="loading-shimmer h-8 w-20 rounded-full" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="loading-shimmer h-24 rounded-[24px]" />
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_360px]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:rounded-[28px]">
              <div className="loading-shimmer h-[260px] rounded-[20px] sm:h-[360px] md:h-[620px] md:rounded-[28px]" />
            </section>
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-200 p-4 md:p-5">
                <div className="loading-shimmer h-3 w-24 rounded-full" />
                <div className="loading-shimmer mt-3 h-7 w-40 rounded-2xl" />
                <div className="mt-4 flex flex-wrap gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="loading-shimmer h-10 w-24 rounded-full" />
                  ))}
                </div>
              </div>
              <div className="space-y-4 p-5 md:p-7">
                <div className="loading-shimmer h-28 rounded-[24px]" />
                <div className="loading-shimmer h-24 rounded-[24px]" />
                <div className="loading-shimmer h-40 rounded-[24px]" />
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:rounded-[28px]">
              <div className="p-5">
                <div className="loading-shimmer h-3 w-24 rounded-full" />
                <div className="loading-shimmer mt-4 h-10 w-36 rounded-[24px]" />
                <div className="loading-shimmer mt-3 h-4 w-1/2 rounded-full" />
              </div>
              <div className="space-y-3 p-5 pt-0">
                <div className="loading-shimmer h-24 rounded-2xl" />
                <div className="loading-shimmer h-24 rounded-2xl" />
                <div className="loading-shimmer h-12 rounded-[22px]" />
              </div>
            </section>
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <div className="loading-shimmer h-24 rounded-[24px]" />
              <div className="mt-3 space-y-2">
                <div className="loading-shimmer h-12 rounded-2xl" />
                <div className="loading-shimmer h-12 rounded-2xl" />
                <div className="loading-shimmer h-12 rounded-2xl" />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
