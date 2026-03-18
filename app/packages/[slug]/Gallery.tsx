"use client"

import { useEffect, useState } from "react"

interface GalleryImage {
  id: string
  image_url: string
}

export default function Gallery({ images }: { images: GalleryImage[] }) {
  const [current, setCurrent] = useState(0)

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
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[28px] border border-white/40 bg-white/50 shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
        <img
          src={images[current].image_url}
          alt={`Gallery image ${current + 1}`}
          className="h-[320px] w-full object-cover md:h-[620px]"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-white/10" />

        <div className="absolute left-5 top-5 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
          Featured Gallery
        </div>

        <div className="absolute bottom-5 right-5 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {current + 1} / {images.length}
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
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                index === current
                  ? "border-orange-300 ring-2 ring-orange-200"
                  : "border-slate-200 hover:-translate-y-0.5 hover:border-orange-200"
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
