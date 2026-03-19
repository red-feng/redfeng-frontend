"use client"

import { useEffect, useMemo, useState } from "react"
import type { Locale } from "@/lib/i18n"

interface GalleryImage {
  id: string
  image_url: string
}

export default function Gallery({ images, locale = "id" }: { images: GalleryImage[]; locale?: Locale }) {
  const [current, setCurrent] = useState(0)
  const copy = useMemo(
    () =>
      locale === "en"
        ? {
            featured: "Featured Gallery",
            journey: "Visual Journey",
            caption: "Discover the atmosphere, scenery, and signature moments waiting across this itinerary.",
          }
        : locale === "zh"
          ? {
              featured: "精选图库",
              journey: "视觉旅程",
              caption: "探索这段行程中的氛围、风景与值得期待的精彩时刻。",
            }
          : {
              featured: "Galeri Unggulan",
              journey: "Perjalanan Visual",
              caption: "Temukan suasana, lanskap, dan momen utama yang menanti di sepanjang itinerary ini.",
            },
    [locale],
  )

  const next = () => {
    setCurrent((prev) => (prev + 1) % images.length)
  }

  const prev = () => {
    setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  useEffect(() => {
    if (images.length <= 1) return
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [images.length])

  if (!images || images.length === 0) return null

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-white/50 shadow-[0_28px_90px_rgba(15,23,42,0.14)]">
        <img
          src={images[current].image_url}
          alt={`Gallery image ${current + 1}`}
          className="h-[360px] w-full object-cover md:h-[680px]"
        />

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(15,23,42,0.08)_38%,rgba(15,23,42,0.58)_100%)]" />

        <div className="absolute left-5 top-5 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
          {copy.featured}
        </div>

        <div className="absolute bottom-5 right-5 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {current + 1} / {images.length}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">{copy.journey}</p>
            <p className="mt-2 text-lg font-medium leading-7 text-white md:text-2xl">
              {copy.caption}
            </p>
          </div>
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-white/15 text-lg text-white backdrop-blur transition hover:bg-white/25"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-white/15 text-lg text-white backdrop-blur transition hover:bg-white/25"
            >
              &gt;
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
          {images.map((img, index) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setCurrent(index)}
              className={`overflow-hidden rounded-[20px] border bg-white shadow-sm transition ${
                index === current
                  ? "border-orange-300 ring-2 ring-orange-200"
                  : "border-slate-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
              }`}
            >
              <img
                src={img.image_url}
                alt={`Thumbnail ${index + 1}`}
                className="h-20 w-full object-cover md:h-24"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
