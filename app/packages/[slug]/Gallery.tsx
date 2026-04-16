"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import type { Locale } from "@/lib/i18n"

interface GalleryImage {
  id: string
  image_url: string
}

type GalleryProps = {
  images: GalleryImage[]
  locale?: Locale
}

export default function Gallery(props: GalleryProps) {
  const { images } = props
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
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-white/50 shadow-[0_28px_90px_rgba(15,23,42,0.14)]">
        <div className="relative h-[360px] w-full md:h-[680px]">
          <Image
            src={images[current].image_url}
            alt={`Gallery image ${current + 1}`}
            fill
            priority
            sizes="(max-width: 767px) 100vw, 1200px"
            className="object-cover"
          />
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
              className={`overflow-hidden rounded-[20px] border bg-white shadow-sm transition ${
                index === current
                  ? "border-orange-300 ring-2 ring-orange-200"
                  : "border-slate-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
              }`}
            >
              <div className="relative h-20 w-full md:h-24">
                <Image
                  src={img.image_url}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  sizes="(max-width: 767px) 25vw, 16vw"
                  className="object-cover"
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
