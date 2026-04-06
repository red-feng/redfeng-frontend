export default function PackagesLoading() {
  return (
    <div className="min-h-screen animate-public-page-in bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f5f7fb_100%)] px-4 py-5 pb-32 sm:px-6 md:px-8">
      <div className="mx-auto max-w-[1360px] space-y-5">
        <div className="h-32 rounded-[30px] border border-orange-100 bg-white/80 p-5 shadow-[0_24px_70px_-42px_rgba(249,115,22,0.22)]">
          <div className="loading-shimmer h-3 w-24 rounded-full" />
          <div className="loading-shimmer mt-4 h-8 w-3/4 rounded-2xl" />
          <div className="loading-shimmer mt-3 h-4 w-full rounded-full" />
          <div className="loading-shimmer mt-2 h-4 w-2/3 rounded-full" />
        </div>

        <div className="rounded-[28px] border border-orange-100/80 bg-white/80 p-4 shadow-[0_20px_55px_-28px_rgba(249,115,22,0.18)]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.95fr)_auto]">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="loading-shimmer h-12 rounded-2xl sm:h-14" />
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.18)] md:flex md:rounded-[28px]">
              <div className="loading-shimmer h-[180px] w-full md:h-[220px] md:w-[280px] md:shrink-0" />
              <div className="flex-1 p-4 md:p-6">
                <div className="loading-shimmer h-6 w-4/5 rounded-2xl md:h-8" />
                <div className="loading-shimmer mt-3 h-4 w-1/2 rounded-full" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="loading-shimmer h-7 w-20 rounded-full" />
                  <div className="loading-shimmer h-7 w-24 rounded-full" />
                  <div className="loading-shimmer h-7 w-16 rounded-full" />
                </div>
                <div className="loading-shimmer mt-5 h-4 w-full rounded-full" />
                <div className="loading-shimmer mt-2 h-4 w-2/3 rounded-full" />
              </div>
              <div className="hidden border-l border-slate-200 bg-slate-50/70 p-6 md:flex md:w-[260px] md:flex-col md:justify-between">
                <div>
                  <div className="loading-shimmer ml-auto h-9 w-28 rounded-2xl" />
                  <div className="loading-shimmer mt-3 ml-auto h-4 w-20 rounded-full" />
                </div>
                <div className="loading-shimmer h-12 w-full rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
