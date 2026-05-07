"use client"

import { useEffect, useState } from "react"
import { HeartIcon } from "@/app/components/home/shared/homeContent"
import { isFavorite, toggleFavorite, type FavoriteEntry } from "@/app/components/favorites/favoritesStore"

type FavoriteButtonProps = {
  item: FavoriteEntry
  className: string
  iconClassName: string
}

export default function FavoriteButton({ item, className, iconClassName }: FavoriteButtonProps) {
  const [active, setActive] = useState(() => {
    if (typeof window === "undefined") return false
    return isFavorite(item.key)
  })

  useEffect(() => {
    const sync = () => setActive(isFavorite(item.key))
    window.addEventListener("redfeng:favorites-changed", sync as EventListener)
    return () => window.removeEventListener("redfeng:favorites-changed", sync as EventListener)
  }, [item.key])

  return (
    <button
      type="button"
      aria-label={active ? "Hapus dari wishlist" : "Simpan ke wishlist"}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setActive(toggleFavorite(item))
      }}
      className={`${className} ${active ? "bg-white text-[#ef5b2a]" : ""}`}
    >
      <HeartIcon className={iconClassName} />
    </button>
  )
}
