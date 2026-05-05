"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDownIcon, SwapIcon } from "@/app/components/home/homeContent"

type HeroSearchFieldOption = {
  label: string
  value: string
  sublabel?: string
  group?: string
}

type HeroSearchFieldProps = {
  className?: string
  label: string
  value: string
  sublabel: string
  withSwap?: boolean
  withChevron?: boolean
  compact?: boolean
  inputType?: "text" | "date" | "select" | "autocomplete"
  options?: HeroSearchFieldOption[]
  onValueChange?: (value: string) => void
  onSwap?: () => void
}

export default function HeroSearchField({
  className = "",
  label,
  value,
  sublabel,
  withSwap = false,
  withChevron = false,
  compact = false,
  inputType = "text",
  options = [],
  onValueChange,
  onSwap,
}: HeroSearchFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draftValue, setDraftValue] = useState(value)
  const fieldRef = useRef<HTMLDivElement | null>(null)
  const hasDropdown = inputType !== "date" && options.length > 0
  const fieldShellClass = `relative w-full bg-[#fdfefe] ${compact ? "min-h-[108px] border-r border-t border-slate-200 px-4 py-4 first:rounded-bl-[20px] lg:min-h-0 lg:rounded-[20px] lg:border lg:px-4 lg:py-3.5" : "border-t border-slate-200 px-4 py-4 first:rounded-t-[20px] last:border-b lg:rounded-[20px] lg:border lg:px-4 lg:py-3.5"} ${className}`
  const filteredOptions = useMemo(() => {
    if (!hasDropdown) return []

    const keyword = (inputType === "autocomplete" ? draftValue : value).trim().toLowerCase()
    if (!keyword) return options

    return options.filter((option) =>
      `${option.label} ${option.value} ${option.sublabel ?? ""}`.toLowerCase().includes(keyword),
    )
  }, [draftValue, hasDropdown, inputType, options, value])
  const groupedOptions = useMemo(() => {
    const groups = new Map<string, HeroSearchFieldOption[]>()

    filteredOptions.forEach((option) => {
      const groupLabel = option.group ?? "Pilihan"
      const currentGroup = groups.get(groupLabel) ?? []
      currentGroup.push(option)
      groups.set(groupLabel, currentGroup)
    })

    return Array.from(groups.entries())
  }, [filteredOptions])

  useEffect(() => {
    setDraftValue(value)
  }, [value])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!fieldRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("mousedown", handlePointerDown)
    window.addEventListener("keydown", handleEscape)
    return () => {
      window.removeEventListener("mousedown", handlePointerDown)
      window.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  return (
    <div ref={fieldRef} className={fieldShellClass}>
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      {inputType === "date" ? (
        <input
          type="date"
          value={value}
          onChange={(event) => onValueChange?.(event.target.value)}
          className="mt-2 w-full bg-transparent pr-8 text-[15px] font-bold text-slate-900 outline-none"
        />
      ) : inputType === "autocomplete" ? (
        <input
          type="text"
          value={draftValue}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            const nextValue = event.target.value
            setDraftValue(nextValue)
            setIsOpen(true)
            onValueChange?.(nextValue)
          }}
          placeholder={label.includes("Destinasi") ? "Cari destinasi atau nama paket" : "Cari kota, bandara, atau tujuan"}
          className="mt-2 w-full bg-transparent pr-8 text-[15px] font-bold text-slate-900 outline-none placeholder:text-slate-300"
        />
      ) : hasDropdown ? (
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="mt-2 flex w-full items-center justify-between gap-3 bg-transparent pr-8 text-left text-[15px] font-bold text-slate-900 outline-none"
        >
          <span className="truncate">{value}</span>
        </button>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onValueChange?.(event.target.value)}
          className="mt-2 w-full bg-transparent pr-8 text-[15px] font-bold text-slate-900 outline-none placeholder:text-slate-300"
        />
      )}
      {sublabel ? <p className="mt-1 text-[11px] text-slate-400">{sublabel}</p> : <p className="mt-1 text-[11px] text-transparent">.</p>}
      {hasDropdown && isOpen ? (
        <div className="absolute left-0 top-[calc(100%+10px)] z-40 w-full min-w-[260px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.38)]">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{getDropdownTitle(label, inputType)}</p>
          </div>
          <div className="max-h-[380px] overflow-y-auto py-2">
            {filteredOptions.length > 0 ? (
              groupedOptions.map(([groupLabel, groupItems]) => (
                <div key={`${label}-${groupLabel}`}>
                  <div className="px-4 pb-2 pt-3 first:pt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">{groupLabel}</p>
                  </div>
                  {groupItems.map((option) => {
                    const isActive = option.value === value

                    return (
                      <button
                        key={`${label}-${option.value}-${option.sublabel ?? ""}`}
                        type="button"
                        onClick={() => {
                          setDraftValue(option.value)
                          onValueChange?.(option.value)
                          setIsOpen(false)
                        }}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${isActive ? "bg-[#fff4f1]" : "hover:bg-slate-50"}`}
                      >
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isActive ? "bg-[#ffe4de] text-[#ff5a43]" : "bg-slate-100 text-slate-500"}`}>
                          <DropdownItemIcon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-slate-900">{option.label}</span>
                          {option.sublabel ? <span className="mt-0.5 block truncate text-[12px] text-slate-500">{option.sublabel}</span> : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-[13px] text-slate-500">Belum ada hasil yang cocok untuk pencarian ini.</div>
            )}
          </div>
        </div>
      ) : null}
      {withSwap ? (
        <button
          type="button"
          onClick={onSwap}
          className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1f2937] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.4)] transition hover:border-[#ffd4cb] hover:bg-[#fff4f1] lg:hidden"
        >
          <SwapIcon className="h-4 w-4" />
        </button>
      ) : null}
      {withChevron ? (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
          <ChevronDownIcon className="h-4 w-4" />
        </span>
      ) : inputType === "autocomplete" ? (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
          <SearchMiniIcon className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  )
}

function getDropdownTitle(label: string, inputType: HeroSearchFieldProps["inputType"]) {
  const normalized = label.toLowerCase()

  if (inputType === "autocomplete") {
    if (normalized.includes("dari") || normalized.includes("ke") || normalized.includes("asal") || normalized.includes("tujuan")) {
      return "Pilihan bandara populer"
    }
    if (normalized.includes("destinasi")) {
      return "Destinasi populer"
    }
    return "Pilihan populer"
  }

  if (normalized.includes("penumpang") || normalized.includes("tamu") || normalized.includes("peserta")) return "Pilihan penumpang"
  if (normalized.includes("durasi")) return "Pilihan durasi"
  return "Pilihan tersedia"
}

function DropdownItemIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-4.35-6-10a6 6 0 1112 0c0 5.65-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  )
}

function SearchMiniIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path strokeLinecap="round" d="M16 16l4 4" />
    </svg>
  )
}
