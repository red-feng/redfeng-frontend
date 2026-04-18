"use client"

import { useRouter } from "next/navigation"

type ConfirmChatLinkProps = {
  href: string
  label: string
  className?: string
  confirmMessage: string
  children?: React.ReactNode
}

export default function ConfirmChatLink({
  href,
  label,
  className,
  confirmMessage,
  children,
}: ConfirmChatLinkProps) {
  const router = useRouter()

  function handleClick() {
    if (!window.confirm(confirmMessage)) return
    router.push(href)
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children || label}
    </button>
  )
}
