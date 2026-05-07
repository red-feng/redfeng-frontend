"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { BellIcon } from "@/app/components/home/shared/homeContent"
import {
  readNotifications,
  unreadNotificationCount,
  type NotificationEntry,
} from "@/app/components/notifications/notificationsStore"

type NotificationBellLinkProps = {
  items: NotificationEntry[]
  className: string
  iconClassName: string
  badgeClassName: string
}

export default function NotificationBellLink({
  items,
  className,
  iconClassName,
  badgeClassName,
}: NotificationBellLinkProps) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    readNotifications(items)
    const sync = () => setUnreadCount(unreadNotificationCount(items))
    sync()
    window.addEventListener("redfeng:notifications-changed", sync as EventListener)
    return () => window.removeEventListener("redfeng:notifications-changed", sync as EventListener)
  }, [items])

  return (
    <Link href="/notifications" className={`relative ${className}`}>
      <BellIcon className={iconClassName} />
      {unreadCount > 0 ? (
        <span className={badgeClassName}>{unreadCount > 9 ? "9+" : unreadCount}</span>
      ) : null}
    </Link>
  )
}
