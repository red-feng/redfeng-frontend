"use client"

import { useState, useEffect } from "react"

interface Image {
  id: string
  image_url: string
}

export default function Gallery({ images }: { images: Image[] }) {
  const [current, setCurrent] = useState(0)

  const next = () => {
    setCurrent((prev) => (prev + 1) % images.length)
  }

  const prev = () => {
    setCurrent((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    )
  }

  // 🔥 Auto slide setiap 5 detik
  useEffect(() => {
    const interval = setInterval(() => {
      next()
    }, 5000)

    return () => clearInterval(interval)
  }, [images.length])

  if (!images || images.length === 0) return null

  return (
    <div className="space-y-4">

      {/* Main Image */}
      <div className="relative">
        <img
          src={images[current].image_url}
          className="w-full h-[450px] object-cover rounded-xl transition duration-300"
        />

        {/* Arrow Left */}
        <button
          onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white px-3 py-2 rounded-full"
        >
          ◀
        </button>

        {/* Arrow Right */}
        <button
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white px-3 py-2 rounded-full"
        >
          ▶
        </button>
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-5 gap-3">
        {images.map((img, index) => (
          <img
            key={img.id}
            src={img.image_url}
            onClick={() => setCurrent(index)}
            className={`h-24 object-cover rounded-lg cursor-pointer transition ${
              index === current
                ? "ring-4 ring-orange-500"
                : "hover:opacity-80"
            }`}
          />
        ))}
      </div>

    </div>
  )
}