"use client"

import { useRouter } from "next/navigation"

type ConfirmChatLinkProps = {
  href: string
  label: string
  className?: string
  confirmMessage: string
  children?: React.ReactNode
  badgeCount?: number
}

export default function ConfirmChatLink({
  href,
  label,
  className,
  children,
  badgeCount = 0,
}: ConfirmChatLinkProps) {
  const router = useRouter()

  function handleClick() {
    router.push(href)
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children ? (
        <span className="relative inline-flex items-center justify-center pr-5">
          <span>{children}</span>
          {badgeCount > 0 ? (
            <span className="absolute -right-1 top-1/2 inline-flex min-w-5 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-[0_4px_10px_rgba(16,185,129,0.28)]">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="relative inline-flex items-center justify-center pr-5">
          <span>{label}</span>
          {badgeCount > 0 ? (
            <span className="absolute -right-1 top-1/2 inline-flex min-w-5 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-[0_4px_10px_rgba(16,185,129,0.28)]">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          ) : null}
        </span>
      )}
    </button>
  )
}
