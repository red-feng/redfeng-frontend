"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  persistNotificationsToAccount,
  readNotifications,
  writeNotifications,
  type NotificationEntry,
} from "@/app/components/notifications/notificationsStore"

type NotificationsPageClientProps = {
  items: NotificationEntry[]
}

export default function NotificationsPageClient({ items }: NotificationsPageClientProps) {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([])

  useEffect(() => {
    setNotifications(readNotifications(items))
  }, [items])

  const syncAndStore = (next: NotificationEntry[]) => {
    setNotifications(next)
    writeNotifications(next)
    void persistNotificationsToAccount(next)
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => syncAndStore(notifications.map((item) => ({ ...item, read: true })))}
          className="inline-flex items-center justify-center rounded-full border border-[#d8dee8] bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-[#c9d2df] hover:bg-[#f8fafc]"
        >
          Tandai semua dibaca
        </button>
      </div>

      {notifications.map((item) => (
        <article
          key={item.id}
          className={`rounded-[28px] border p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-6 ${
            item.read ? "border-[#f0ddc7] bg-white" : "border-[#ffe3d8] bg-[#fff8f4]"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-[#ffe3d8] bg-[#fff4ef] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ef5b2a]">
                {item.tag}
              </span>
              <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.03em] text-slate-950">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={item.href}
                onClick={() => syncAndStore(notifications.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)))}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Buka
              </Link>
              <button
                type="button"
                onClick={() =>
                  syncAndStore(
                    notifications.map((entry) =>
                      entry.id === item.id ? { ...entry, read: !entry.read } : entry,
                    ),
                  )
                }
                className="inline-flex items-center justify-center rounded-full border border-[#d8dee8] bg-[#f8fafc] px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-[#c9d2df] hover:bg-[#f1f5f9]"
              >
                {item.read ? "Tandai belum dibaca" : "Tandai dibaca"}
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}
