"use client"

type ConfirmSubmitButtonProps = {
  children: React.ReactNode
  className: string
  confirmMessage: string
}

export default function ConfirmSubmitButton({
  children,
  className,
  confirmMessage,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault()
        }
      }}
      className={className}
    >
      {children}
    </button>
  )
}
