"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  readFavorites,
  type FavoriteEntry,
} from "@/app/components/favorites/favoritesStore"

type WishlistPageClientProps = {
  suggestedItems: FavoriteEntry[]
}

export default function WishlistPageClient({ suggestedItems }: WishlistPageClientProps) {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([])

  useEffect(() => {
    const sync = () => setFavorites(readFavorites())
    sync()
    window.addEventListener("redfeng:favorites-changed", sync as EventListener)
    return () => window.removeEventListener("redfeng:favorites-changed", sync as EventListener)
  }, [])

  if (favorites.length === 0) {
    return (
      <section className="space-y-5">
        <article className="rounded-[28px] border border-[#f0ddc7] bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">Wishlist kosong</p>
          <h2 className="mt-3 text-[22px] font-semibold tracking-[-0.03em] text-slate-950">Belum ada item yang disimpan.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Tekan ikon heart di promo, popular booking, atau destinasi untuk mulai menyimpan favorit Anda di perangkat ini.
          </p>
        </article>

        <section className="grid gap-4 lg:grid-cols-3">
          {suggestedItems.slice(0, 6).map((item) => (
            <Link key={item.key} href={item.href} className="rounded-[24px] border border-[#eceff4] bg-white px-4 py-4 shadow-[0_16px_38px_-32px_rgba(15,23,42,0.12)] transition hover:border-orange-200 hover:bg-orange-50/30">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              {item.subtitle ? <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p> : null}
              {item.meta ? <p className="mt-2 text-xs font-medium text-orange-600">{item.meta}</p> : null}
            </Link>
          ))}
        </section>
      </section>
    )
  }

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {favorites.map((item) => (
        <Link key={item.key} href={item.href} className="rounded-[24px] border border-[#eceff4] bg-white px-4 py-4 shadow-[0_16px_38px_-32px_rgba(15,23,42,0.12)] transition hover:border-orange-200 hover:bg-orange-50/30">
          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
          {item.subtitle ? <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p> : null}
          {item.meta ? <p className="mt-2 text-xs font-medium text-orange-600">{item.meta}</p> : null}
        </Link>
      ))}
    </section>
  )
}
