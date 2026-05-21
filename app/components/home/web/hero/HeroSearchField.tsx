"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDownIcon, SwapIcon } from "@/app/components/home/shared/homeContent"
import type { HeroPassengerState } from "@/app/components/home/web/hero/heroSearchContent"

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
  style?: React.CSSProperties
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
  inputType?: "text" | "date" | "select" | "autocomplete" | "passenger"
  desktopDensity?: "default" | "compact"
  options?: HeroSearchFieldOption[]
  passengerState?: HeroPassengerState
  cabinOptions?: string[]
  onValueChange?: (value: string) => void
  onSwap?: () => void
  locale?: "id" | "en" | "zh"
}

export default function HeroSearchField({
  className = "",
  style,
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
  desktopDensity = "default",
  options = [],
  passengerState,
  onValueChange,
  onSwap,
  locale = "id",
}: HeroSearchFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draftValue, setDraftValue] = useState(value)
  const [draftPassengerState, setDraftPassengerState] = useState<HeroPassengerState | null>(passengerState ?? null)
  const fieldRef = useRef<HTMLDivElement | null>(null)
  const isPassengerField = inputType === "passenger" && Boolean(passengerState)
  const hasDropdown = !isPassengerField && inputType !== "date" && options.length > 0
  const isSearchboxDesktop = variant === "searchbox-desktop"
  const isCompactDesktopField = isSearchboxDesktop && desktopDensity === "compact"
  const isDesktopPill = className.includes("rounded-[28px]") || isSearchboxDesktop
  const shouldShowDefaultAdornment = !renderValue
  const shellBaseClass = isSearchboxDesktop
    ? `${isCompactDesktopField ? "min-h-[38px]" : "min-h-[62px]"} border border-[#dbe4ee] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]`
    : isDesktopPill
    ? "min-h-[68px] border bg-white"
    : compact
      ? "min-h-[108px] border-r border-t border-slate-200 bg-[#fefefe] first:rounded-bl-[20px] lg:min-h-0 lg:rounded-[24px] lg:border"
      : "border-t border-slate-200 bg-[#fefefe] first:rounded-t-[20px] last:border-b lg:rounded-[24px] lg:border"
  const fieldShellClass = `relative w-full overflow-visible ${isOpen ? "z-[260]" : "z-0"} ${shellBaseClass} ${className}`
  const iconClassName = isDesktopPill ? "h-[18px] w-[18px]" : "h-4 w-4"
  const labelClassName = isSearchboxDesktop ? "text-[13px] font-semibold leading-[1.2] text-[#42526b]" : isDesktopPill ? "text-[13px] font-medium leading-[1.2] text-[#4a5f7b]" : "text-[13px] font-medium leading-[1.2] text-slate-400"
  const valueClassName = isSearchboxDesktop
    ? `${isCompactDesktopField ? "text-[13px] font-semibold leading-none tracking-[-0.01em] text-[#17263c]" : "text-[13px] font-semibold leading-[1.2] tracking-[-0.01em] text-[#17263c]"}`
    : isDesktopPill
      ? "text-[13px] font-semibold leading-[1.2] text-[#12243d]"
      : "text-[13px] font-semibold leading-[1.2] text-slate-900"
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
    setDraftPassengerState(passengerState ?? null)
  }, [passengerState])

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
    <div ref={fieldRef} className={fieldShellClass} style={style}>
      <div className={isSearchboxDesktop ? "flex h-full min-h-full items-center" : isDesktopPill ? "flex items-center gap-3" : ""}>
        {isDesktopPill && !isSearchboxDesktop ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f6f9fc] text-[#8fa0b7]">
            <FieldIcon icon={fieldIcon} className={iconClassName} />
          </span>
        ) : null}
        <div className={`min-w-0 flex-1 ${isSearchboxDesktop ? "flex h-full items-center" : ""}`}>
          {hideLabel ? null : <p className={labelClassName}>{visibleLabel}</p>}
      {renderValue ? (
        <button
          type="button"
          onClick={() => {
            if (hasDropdown || withChevron || isPassengerField) {
              setIsOpen((current) => !current)
            }
          }}
          className={`${hideLabel ? "" : "mt-[6px]"} ${isSearchboxDesktop ? `flex ${isCompactDesktopField ? "min-h-[20px]" : "min-h-[24px]"} items-center` : ""} w-full bg-transparent text-left outline-none`}
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
      ) : isPassengerField && draftPassengerState ? (
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className={`${hideLabel ? "" : "mt-[6px]"} flex w-full items-center justify-between gap-3 bg-transparent ${isSearchboxDesktop ? `${isCompactDesktopField ? "min-h-[20px] pt-[5px] pb-0" : "min-h-[24px]"} pr-[40px]` : isDesktopPill ? "pr-10" : "pr-8"} text-left ${valueClassName} outline-none`}
        >
          <span className="min-w-0">
            <span className="block truncate">{visibleValue}</span>
            {hideSublabel ? null : visibleSublabel ? <span className={`mt-1 block ${sublabelClassName}`}>{visibleSublabel}</span> : null}
          </span>
        </button>
      ) : hasDropdown ? (
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className={`${hideLabel ? "" : "mt-[6px]"} flex w-full items-center justify-between gap-3 bg-transparent ${isSearchboxDesktop ? `${isCompactDesktopField ? "min-h-[20px] pt-[5px] pb-0" : "min-h-[24px]"} pr-[40px]` : isDesktopPill ? "pr-10" : "pr-8"} text-left ${valueClassName} outline-none`}
        >
          <span className={`truncate ${isCompactDesktopField ? "relative top-[3px]" : ""}`}>{visibleValue}</span>
        </button>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onValueChange?.(event.target.value)}
          className={`${hideLabel ? "" : "mt-[6px]"} w-full bg-transparent ${isSearchboxDesktop ? "pr-[40px]" : isDesktopPill ? "pr-10" : "pr-8"} ${valueClassName} outline-none placeholder:text-slate-300`}
        />
      )}
          {isPassengerField ? null : hideSublabel ? null : visibleSublabel ? <p className={`mt-1 ${sublabelClassName}`}>{visibleSublabel}</p> : <p className={`mt-1 ${sublabelClassName} text-transparent`}>.</p>}
        </div>
      </div>
      {isPassengerField && isOpen && draftPassengerState ? (
        <div className="absolute left-0 top-[calc(100%+10px)] z-[280] w-full min-w-[320px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.38)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {locale === "en" ? "Passengers" : locale === "zh" ? "乘客" : "Penumpang"}
              </p>
              <p className="mt-1 text-[15px] font-semibold text-slate-900">
                {locale === "en" ? "Set passenger counts" : locale === "zh" ? "设置乘客数量" : "Atur jumlah penumpang"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDraftPassengerState(passengerState ?? null)
                setIsOpen(false)
              }}
              className="text-slate-400 transition hover:text-slate-700"
            >
              <CloseMiniIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-5 px-5 py-5">
            {([
              ["adults", locale === "en" ? "Adult" : locale === "zh" ? "成人" : "Dewasa", locale === "en" ? "Age 12 and above" : locale === "zh" ? "12 岁及以上" : "Usia 12 tahun ke atas"],
              ["children", locale === "en" ? "Child" : locale === "zh" ? "儿童" : "Anak", locale === "en" ? "Age 2 - 11" : locale === "zh" ? "2 - 11 岁" : "Usia 2 - 11 tahun"],
              ["infants", locale === "en" ? "Infant" : locale === "zh" ? "婴儿" : "Bayi", locale === "en" ? "Below age 2" : locale === "zh" ? "2 岁以下" : "Di bawah 2 tahun"],
            ] as const).map(([key, title, subtitle]) => {
              const currentValue = draftPassengerState[key]
              const minimum = key === "adults" ? 1 : 0
              const maximum = key === "infants" ? draftPassengerState.adults : 9

              return (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-slate-900">{title}</p>
                    <p className="mt-1 text-[13px] text-slate-500">{subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PassengerCounterButton
                      label="-"
                      disabled={currentValue <= minimum}
                      onClick={() =>
                        setDraftPassengerState((current) => {
                          if (!current) return current
                          const nextValue = Math.max(minimum, current[key] - 1)
                          const nextAdults = key === "adults" ? nextValue : current.adults
                          return {
                            ...current,
                            [key]: nextValue,
                            infants: key === "adults" ? Math.min(current.infants, nextAdults) : current.infants,
                          }
                        })
                      }
                    />
                    <span className="flex min-w-[48px] justify-center border-b border-slate-200 pb-1 text-[24px] font-semibold leading-none text-slate-900">
                      {currentValue}
                    </span>
                    <PassengerCounterButton
                      label="+"
                      disabled={currentValue >= maximum}
                      onClick={() =>
                        setDraftPassengerState((current) => {
                          if (!current) return current
                          const nextValue = Math.min(maximum, current[key] + 1)
                          return { ...current, [key]: nextValue }
                        })
                      }
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-5 pb-5">
            <button
              type="button"
              onClick={() => {
                if (!draftPassengerState) return
                onValueChange?.(JSON.stringify(draftPassengerState))
                setIsOpen(false)
              }}
              className="inline-flex h-12 w-full items-center justify-center rounded-[16px] bg-[#ff6624] text-[15px] font-semibold text-white transition hover:opacity-95"
            >
              {locale === "en" ? "Done" : locale === "zh" ? "完成" : "Selesai"}
            </button>
          </div>
        </div>
      ) : null}
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

function PassengerCounterButton({
  label,
  disabled,
  onClick,
}: {
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-slate-100 text-[24px] leading-none text-[#2291ff] transition enabled:hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-300"
    >
      {label}
    </button>
  )
}

function CloseMiniIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
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

