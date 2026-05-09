"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDownIcon, SwapIcon } from "@/app/components/home/shared/homeContent"

type HeroSearchFieldOption = {
  label: string
  value: string
  sublabel?: string
  group?: string
  displayValue?: string
  displaySublabel?: string
  displayGroup?: string
}

type HeroSearchFieldProps = {
  className?: string
  label: string
  displayLabel?: string
  value: string
  displayValue?: string
  sublabel: string
  displaySublabel?: string
  renderValue?: ReactNode
  hideLabel?: boolean
  hideSublabel?: boolean
  withSwap?: boolean
  withChevron?: boolean
  compact?: boolean
  variant?: "default" | "searchbox-desktop"
  inputType?: "text" | "date" | "select" | "autocomplete"
  options?: HeroSearchFieldOption[]
  onValueChange?: (value: string) => void
  onSwap?: () => void
  locale?: "id" | "en" | "zh"
}

export default function HeroSearchField({
  className = "",
  label,
  displayLabel,
  value,
  displayValue,
  sublabel,
  displaySublabel,
  renderValue,
  hideLabel = false,
  hideSublabel = false,
  withSwap = false,
  withChevron = false,
  compact = false,
  variant = "default",
  inputType = "text",
  options = [],
  onValueChange,
  onSwap,
  locale = "id",
}: HeroSearchFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draftValue, setDraftValue] = useState(value)
  const fieldRef = useRef<HTMLDivElement | null>(null)
  const hasDropdown = inputType !== "date" && options.length > 0
  const isSearchboxDesktop = variant === "searchbox-desktop"
  const isDesktopPill = className.includes("rounded-[28px]") || isSearchboxDesktop
  const shouldShowDefaultAdornment = !renderValue
  const shellBaseClass = isSearchboxDesktop
    ? "min-h-[62px] border border-[#dbe4ee] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
    : isDesktopPill
    ? "min-h-[68px] border bg-white"
    : compact
      ? "min-h-[108px] border-r border-t border-slate-200 bg-[#fefefe] first:rounded-bl-[20px] lg:min-h-0 lg:rounded-[24px] lg:border"
      : "border-t border-slate-200 bg-[#fefefe] first:rounded-t-[20px] last:border-b lg:rounded-[24px] lg:border"
  const fieldShellClass = `relative w-full overflow-visible ${isOpen ? "z-[260]" : "z-0"} ${shellBaseClass} ${className}`
  const iconClassName = isDesktopPill ? "h-[18px] w-[18px]" : "h-4 w-4"
  const labelClassName = isSearchboxDesktop ? "text-[13px] font-semibold leading-[1.2] text-[#42526b]" : isDesktopPill ? "text-[13px] font-medium leading-[1.2] text-[#4a5f7b]" : "text-[13px] font-medium leading-[1.2] text-slate-400"
  const valueClassName = isSearchboxDesktop ? "text-[13px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#17263c]" : isDesktopPill ? "text-[13px] font-semibold leading-[1.2] text-[#12243d]" : "text-[13px] font-semibold leading-[1.2] text-slate-900"
  const sublabelClassName = "text-[13px] leading-[1.2] text-slate-400"
  const fieldIcon = getFieldIcon(label, inputType)
  const visibleLabel = displayLabel ?? label
  const visibleValue = displayValue ?? value
  const visibleSublabel = displaySublabel ?? sublabel
  const filteredOptions = useMemo(() => {
    if (!hasDropdown) return []

    const keyword = (inputType === "autocomplete" ? draftValue : value).trim().toLowerCase()
    if (!keyword) return options

    return options.filter((option) =>
      `${option.group ?? ""} ${option.displayGroup ?? ""} ${option.label} ${option.value} ${option.displayValue ?? ""} ${option.sublabel ?? ""} ${option.displaySublabel ?? ""}`
        .toLowerCase()
        .includes(keyword),
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
      <div className={isSearchboxDesktop ? "" : isDesktopPill ? "flex items-center gap-3" : ""}>
        {isDesktopPill && !isSearchboxDesktop ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f6f9fc] text-[#8fa0b7]">
            <FieldIcon icon={fieldIcon} className={iconClassName} />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {hideLabel ? null : <p className={labelClassName}>{visibleLabel}</p>}
      {renderValue ? (
        <button
          type="button"
          onClick={() => {
            if (hasDropdown || withChevron) {
              setIsOpen((current) => !current)
            }
          }}
          className={`${hideLabel ? "" : "mt-[6px]"} w-full bg-transparent text-left outline-none`}
        >
          {renderValue}
        </button>
      ) : inputType === "date" ? (
        isSearchboxDesktop ? (
          <input
            type="text"
          value={formatIsoToSlashDate(value)}
            readOnly
            className={`${hideLabel ? "" : "mt-[6px]"} w-full bg-transparent pr-[40px] ${valueClassName} outline-none`}
          />
        ) : (
          <input
            type="date"
            value={value}
            onChange={(event) => onValueChange?.(event.target.value)}
            className={`${hideLabel ? "" : "mt-[6px]"} w-full bg-transparent ${isDesktopPill ? "pr-10" : "pr-8"} ${valueClassName} outline-none`}
          />
        )
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
          placeholder={
            label.includes("Destinasi")
              ? locale === "en"
                ? "Search destinations or package names"
                : locale === "zh"
                  ? "搜索目的地或套餐名称"
                  : "Cari destinasi atau nama paket"
              : locale === "en"
                ? "Search cities, airports, or destinations"
                : locale === "zh"
                  ? "搜索城市、机场或目的地"
                  : "Cari kota, bandara, atau tujuan"
          }
          className={`${hideLabel ? "" : "mt-[6px]"} w-full bg-transparent ${isSearchboxDesktop ? "pr-[40px]" : isDesktopPill ? "pr-10" : "pr-8"} ${valueClassName} outline-none placeholder:text-slate-300`}
        />
      ) : hasDropdown ? (
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className={`${hideLabel ? "" : "mt-[6px]"} flex w-full items-center justify-between gap-3 bg-transparent ${isSearchboxDesktop ? "pr-[40px]" : isDesktopPill ? "pr-10" : "pr-8"} text-left ${valueClassName} outline-none`}
        >
          <span className="truncate">{visibleValue}</span>
        </button>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onValueChange?.(event.target.value)}
          className={`${hideLabel ? "" : "mt-[6px]"} w-full bg-transparent ${isSearchboxDesktop ? "pr-[40px]" : isDesktopPill ? "pr-10" : "pr-8"} ${valueClassName} outline-none placeholder:text-slate-300`}
        />
      )}
          {hideSublabel ? null : visibleSublabel ? <p className={`mt-1 ${sublabelClassName}`}>{visibleSublabel}</p> : <p className={`mt-1 ${sublabelClassName} text-transparent`}>.</p>}
        </div>
      </div>
      {hasDropdown && isOpen ? (
        <div className="absolute left-0 top-[calc(100%+10px)] z-[280] w-full min-w-[260px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.38)]">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{getDropdownTitle(label, inputType, locale)}</p>
          </div>
          <div className="max-h-[380px] overflow-y-auto py-2">
            {filteredOptions.length > 0 ? (
              groupedOptions.map(([groupLabel, groupItems]) => (
                <div key={`${label}-${groupLabel}`} className="border-t border-slate-100/80 first:border-t-0">
                  {(() => {
                    const airportGroupMeta = getAirportGroupMeta(groupLabel, groupItems)

                    return (
                  <div className="px-4 pb-1 pt-4 first:pt-2">
                    {airportGroupMeta ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fff1ec] text-[#ff5a43]">
                            <LocationMiniIcon className="h-3.5 w-3.5" />
                          </span>
                          <p className="truncate text-[13px] font-semibold text-slate-800">{airportGroupMeta.city}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          {airportGroupMeta.count} {locale === "en" ? "airports" : locale === "zh" ? "机场" : "bandara"}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[13px] font-semibold text-slate-700">{groupItems[0]?.displayGroup || groupLabel}</p>
                    )}
                  </div>
                    )
                  })()}
                  {groupItems.map((option) => {
                    const isActive = option.value === value
                    const airportOptionMeta = getAirportOptionMeta(option)

                    return (
                      <button
                        key={`${label}-${option.value}-${option.sublabel ?? ""}`}
                        type="button"
                        onClick={() => {
                          setDraftValue(option.value)
                          onValueChange?.(option.value)
                          setIsOpen(false)
                        }}
                        className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition ${isActive ? "bg-[#fff4f1]" : "hover:bg-slate-50"}`}
                      >
                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isActive ? "bg-[#ffe4de] text-[#ff5a43]" : "bg-slate-100 text-slate-500"}`}>
                          <DropdownItemIcon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          {airportOptionMeta ? (
                            <>
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tracking-[0.08em] text-slate-700">
                                  {airportOptionMeta.code}
                                </span>
                                <span className="truncate text-[13px] font-semibold text-slate-900">{option.displayValue || airportOptionMeta.city}</span>
                              </span>
                              {option.sublabel ? <span className="mt-0.5 block truncate text-[13px] text-slate-500">{formatOptionSublabel(option)}</span> : null}
                            </>
                          ) : (
                            <>
                              <span className="block truncate text-[13px] font-semibold text-slate-900">{option.displayValue || option.label}</span>
                              {option.sublabel ? <span className="mt-0.5 block truncate text-[13px] text-slate-500">{formatOptionSublabel(option)}</span> : null}
                            </>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-[13px] text-slate-500">
                {locale === "en"
                  ? "No matching results for this search yet."
                  : locale === "zh"
                    ? "暂时没有匹配的搜索结果。"
                    : "Belum ada hasil yang cocok untuk pencarian ini."}
              </div>
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
      {shouldShowDefaultAdornment && withChevron ? (
        <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${isSearchboxDesktop ? "text-[#7f90a8]" : isDesktopPill ? "text-[#7b8aa1]" : "text-slate-500"}`}>
          <ChevronDownIcon className="h-4 w-4" />
        </span>
      ) : shouldShowDefaultAdornment && inputType === "autocomplete" && !isDesktopPill ? (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
          <SearchMiniIcon className="h-4 w-4" />
        </span>
      ) : shouldShowDefaultAdornment && inputType === "autocomplete" && isSearchboxDesktop ? (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#97a8bc]">
          <SearchMiniIcon className="h-[18px] w-[18px]" />
        </span>
      ) : shouldShowDefaultAdornment && inputType === "date" && isDesktopPill ? (
        <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${isSearchboxDesktop ? "text-[#111111]" : "text-[#7b8aa1]"}`}>
          <CalendarMiniIcon className="h-[18px] w-[18px]" />
        </span>
      ) : null}
    </div>
  )
}

function FieldIcon({ icon, className = "" }: { icon: "location" | "calendar" | "passenger" | "ticket"; className?: string }) {
  if (icon === "calendar") return <CalendarMiniIcon className={className} />
  if (icon === "passenger") return <PassengerMiniIcon className={className} />
  if (icon === "ticket") return <TicketMiniIcon className={className} />
  return <LocationMiniIcon className={className} />
}

function getDropdownTitle(label: string, inputType: HeroSearchFieldProps["inputType"], locale: "id" | "en" | "zh") {
  const normalized = label.toLowerCase()

  if (inputType === "autocomplete") {
    if (normalized.includes("dari") || normalized.includes("ke") || normalized.includes("asal") || normalized.includes("tujuan")) {
      return locale === "en" ? "Popular airport picks" : locale === "zh" ? "热门机场选择" : "Pilihan bandara populer"
    }
    if (normalized.includes("destinasi")) {
      return locale === "en" ? "Popular destinations" : locale === "zh" ? "热门目的地" : "Destinasi populer"
    }
    return locale === "en" ? "Popular picks" : locale === "zh" ? "热门选择" : "Pilihan populer"
  }

  if (normalized.includes("penumpang") || normalized.includes("tamu") || normalized.includes("peserta")) {
    return locale === "en" ? "Passenger options" : locale === "zh" ? "乘客选项" : "Pilihan penumpang"
  }
  if (normalized.includes("durasi")) return locale === "en" ? "Duration options" : locale === "zh" ? "时长选项" : "Pilihan durasi"
  return locale === "en" ? "Available options" : locale === "zh" ? "可用选项" : "Pilihan tersedia"
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

function LocationMiniIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20s-6-4.4-6-9.4a6 6 0 1 1 12 0c0 5-6 9.4-6 9.4Z" />
      <circle cx="12" cy="10.5" r="2.5" />
    </svg>
  )
}

function CalendarMiniIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="4" y="6" width="16" height="14" rx="2.5" />
      <path strokeLinecap="round" d="M8 4v4M16 4v4M4 10h16" />
    </svg>
  )
}

function PassengerMiniIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="9" cy="8.5" r="2.5" />
      <circle cx="16.5" cy="9.5" r="2" />
      <path strokeLinecap="round" d="M4.5 18c.8-2.7 2.7-4 5.7-4s4.9 1.3 5.7 4M14.8 17.5c.5-1.8 1.8-2.8 3.9-2.8 1 0 1.9.2 2.8.7" />
    </svg>
  )
}

function TicketMiniIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M5 8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5v2a2 2 0 0 0 0 4v1A2.5 2.5 0 0 1 16.5 18h-9A2.5 2.5 0 0 1 5 15.5v-1a2 2 0 0 0 0-4v-2Z" />
      <path strokeLinecap="round" d="M12 8v8" strokeDasharray="1.6 2.6" />
    </svg>
  )
}

function getFieldIcon(label: string, inputType: HeroSearchFieldProps["inputType"]) {
  const normalized = label.toLowerCase()

  if (
    inputType === "date" ||
    normalized.includes("berangkat") ||
    normalized.includes("pulang") ||
    normalized.includes("check-in") ||
    normalized.includes("check-out") ||
    normalized.includes("tanggal") ||
    normalized.includes("keberangkatan") ||
    normalized.includes("pergi")
  ) {
    return "calendar" as const
  }

  if (normalized.includes("penumpang") || normalized.includes("tamu") || normalized.includes("peserta")) {
    return "passenger" as const
  }

  if (normalized.includes("tiket")) {
    return "ticket" as const
  }

  return "location" as const
}

function formatIsoToSlashDate(input: string) {
  const [year, month, day] = input.split("-")
  if (!year || !month || !day) return input
  return `${day}/${month}/${year}`
}

function getAirportOptionMeta(option: HeroSearchFieldOption) {
  const normalizedLabel = option.label.trim()
  if (!/^[A-Z]{3}$/.test(normalizedLabel)) return null

  const match = option.value.match(/^[A-Z]{3}\s+(.*)$/)
  if (!match) return null

  return {
    code: normalizedLabel,
    city: match[1],
  }
}

function getAirportGroupMeta(groupLabel: string, items: HeroSearchFieldOption[]) {
  if (!groupLabel.trim()) return null
  if (items.length === 0) return null
  const allAirportOptions = items.every((item) => Boolean(getAirportOptionMeta(item)))
  if (!allAirportOptions) return null

  return {
    city: groupLabel,
    count: items.length,
  }
}

function formatOptionSublabel(option: HeroSearchFieldOption) {
  const visibleSublabel = option.displaySublabel ?? option.sublabel ?? ""
  if (!option.group || !visibleSublabel) return visibleSublabel

  const normalizedLabel = option.label.trim()
  return visibleSublabel.replace(new RegExp(`^${normalizedLabel}\\s+[•\\-]\\s*`), "").trim()
}

