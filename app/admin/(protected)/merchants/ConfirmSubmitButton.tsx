"use client"

import { useFormStatus } from "react-dom"

type ConfirmSubmitButtonProps = {
  children: React.ReactNode
  className: string
  confirmMessage: string
  pendingLabel?: string
}

function SubmitButtonInner({
  children,
  className,
  pendingLabel,
}: {
  children: React.ReactNode
  className: string
  pendingLabel?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} ${pending ? "cursor-not-allowed opacity-70" : ""}`}
    >
      {pending ? pendingLabel || "Sedang diproses..." : children}
    </button>
  )
}

export default function ConfirmSubmitButton({
  children,
  className,
  confirmMessage: _confirmMessage,
  pendingLabel,
}: ConfirmSubmitButtonProps) {
  void _confirmMessage
  return <SubmitButtonInner className={className} pendingLabel={pendingLabel}>{children}</SubmitButtonInner>
}
