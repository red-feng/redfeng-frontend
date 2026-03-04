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
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl">
        <img
          src={images[current].image_url}
          alt={`Gallery image ${current + 1}`}
          className="h-[260px] w-full object-cover md:h-[500px]"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-3 py-2 text-white hover:bg-black/60"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-3 py-2 text-white hover:bg-black/60"
            >
              &gt;
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
          {images.map((img, index) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setCurrent(index)}
              className={`overflow-hidden rounded-lg border ${
                index === current ? "border-orange-500 ring-2 ring-orange-300" : "border-slate-200"
              }`}
            >
              <img
                src={img.image_url}
                alt={`Thumbnail ${index + 1}`}
                className="h-16 w-full object-cover md:h-20"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
