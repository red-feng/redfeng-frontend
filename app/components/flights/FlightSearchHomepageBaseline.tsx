"use client"

import type { ReactNode } from "react"

// Homepage and flights landing use this file as the visual source of truth.
// Do not modify it for catalog-specific refinements.

export function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M3 13.5h7.3l4.2 5.1c.3.4.8.6 1.3.6h1.5l-2.4-5.7h4.2c.9 0 1.7-.6 1.9-1.5l.2-.8-.2-.8c-.2-.9-1-1.5-1.9-1.5h-4.2l2.4-5.7h-1.5c-.5 0-1 .2-1.3.6l-4.2 5.1H3l-.8 1.2.8 1.4Z" />
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
      <path d="M8 3.5v4M16 3.5v4M4 9.5h16" />
    </svg>
  )
}

export function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <circle cx="9" cy="8.5" r="2.5" />
      <circle cx="16" cy="9.5" r="2" />
      <path d="M4.5 17c.8-2.3 2.7-3.8 5.3-3.8 2.6 0 4.5 1.5 5.3 3.8" />
      <path d="M14 16.5c.5-1.5 1.8-2.5 3.7-2.5 1.2 0 2.2.3 3 .9" />
    </svg>
  )
}

export function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  )
}

export function FlightSearchTripTab({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[12px] transition lg:border-b-[2px] lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-0 lg:py-[0.7rem] lg:text-[14px] ${
        active
          ? "border-[#ef3b2d] bg-[#fff4f1] text-[#ef3b2d] lg:bg-transparent"
          : "border-transparent bg-transparent text-[#53657e] hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      {label}
    </button>
  )
}

export function FlightSearchStaticField({
  icon,
  label,
  value,
  sublabel,
  withLeftBorder = false,
}: {
  icon: ReactNode
  label: string
  value: string
  sublabel: string
  withLeftBorder?: boolean
}) {
  return (
    <div
      className={`relative flex min-w-0 items-center gap-3 px-3.5 py-3 md:px-4.5 ${
        withLeftBorder ? "border-t border-slate-100 xl:border-l xl:border-t-0" : "rounded-[22px]"
      }`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff3ee] text-[#ef4423] shadow-inner">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="block text-[11px] text-slate-500">{label}</p>
        <div className="mt-1 flex items-center gap-3 rounded-[12px] bg-transparent">
          <span className="min-w-0 flex-1 truncate pr-2 text-[15px] font-semibold leading-6 text-slate-950">{value}</span>
          <span className="shrink-0 text-slate-400">
            <ChevronIcon />
          </span>
        </div>
        <p className="mt-1 truncate text-[12px] text-slate-500">{sublabel}</p>
      </div>
    </div>
  )
}
