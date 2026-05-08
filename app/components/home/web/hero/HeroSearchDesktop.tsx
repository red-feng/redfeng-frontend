import type { ReactNode } from "react"
import Link from "next/link"
import HeroSearchField from "@/app/components/home/web/hero/HeroSearchField"
import { ChevronDownIcon, SwapIcon } from "@/app/components/home/shared/homeContent"
import type { HeroSearchConfig } from "@/app/components/home/web/hero/heroSearchContent"

type HeroRenderedField = HeroSearchConfig["desktopFields"][number] & {
  inputType: "text" | "date" | "select" | "autocomplete"
  options?: { label: string; value: string; sublabel?: string }[]
}

type HeroSearchDesktopProps = {
  config: HeroSearchConfig
  fields?: HeroRenderedField[]
  onFieldChange?: (index: number, value: string) => void
  onSwap?: () => void
}

export default function HeroSearchDesktop({ config, fields, onFieldChange, onSwap }: HeroSearchDesktopProps) {
  const { ctaHref, ctaLabel, desktopGridClass, showDesktopSwap = false } = config
  const desktopFields = (fields ?? config.desktopFields) as HeroRenderedField[]
  const isDedicatedFlightOneWay = config.ctaHref === "/pesawat" && config.activeOption === "one_way" && showDesktopSwap && desktopFields.length === 4

  if (isDedicatedFlightOneWay) {
    return (
      <FlightOneWayDesktopSearch
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
        fields={desktopFields}
        onFieldChange={onFieldChange}
        onSwap={onSwap}
      />
    )
  }

  return (
    <div className={`${desktopGridClass} relative overflow-visible`}>
      {showDesktopSwap ? (
        <>
          <DesktopFieldShell label={desktopFields[0].label}>
            <HeroSearchField
              label={desktopFields[0].label}
              value={desktopFields[0].value}
              sublabel={desktopFields[0].sublabel ?? ""}
              hideLabel
              hideSublabel
              variant="searchbox-desktop"
              inputType={desktopFields[0].inputType}
              options={desktopFields[0].options}
              onValueChange={(value) => onFieldChange?.(0, value)}
              className="rounded-[999px] px-6 py-3"
            />
          </DesktopFieldShell>
          <button type="button" onClick={onSwap} className="relative mx-auto hidden h-[66px] w-[56px] items-center justify-center text-[#ff5a43] lg:flex">
            <span className="absolute left-[8px] top-1/2 h-7 w-px -translate-y-1/2 bg-[#e5ebf2]" />
            <SwapIcon className="h-[15px] w-[15px]" />
            <span className="absolute right-[8px] top-1/2 h-7 w-px -translate-y-1/2 bg-[#e5ebf2]" />
          </button>
          <DesktopFieldShell label={desktopFields[1].label}>
            <HeroSearchField
              label={desktopFields[1].label}
              value={desktopFields[1].value}
              sublabel={desktopFields[1].sublabel ?? ""}
              hideLabel
              hideSublabel
              variant="searchbox-desktop"
              inputType={desktopFields[1].inputType}
              options={desktopFields[1].options}
              onValueChange={(value) => onFieldChange?.(1, value)}
              className="rounded-[999px] px-6 py-3"
            />
          </DesktopFieldShell>
          {desktopFields.slice(2).map((field, index) => (
            <DesktopFieldShell key={field.label} label={field.label}>
              <HeroSearchField
                label={field.label}
                value={field.value}
                sublabel={field.sublabel ?? ""}
                hideLabel
                hideSublabel
                withChevron={field.withChevron}
                variant="searchbox-desktop"
                inputType={field.inputType}
                options={field.options}
                onValueChange={(value) => onFieldChange?.(index + 2, value)}
                className="rounded-[999px] px-6 py-3"
              />
            </DesktopFieldShell>
          ))}
        </>
      ) : (
        desktopFields.map((field, index) => (
          <DesktopFieldShell key={field.label} label={field.label}>
            <HeroSearchField
              label={field.label}
              value={field.value}
              sublabel={field.sublabel ?? ""}
              hideLabel
              hideSublabel
              withChevron={field.withChevron}
              variant="searchbox-desktop"
              inputType={field.inputType}
              options={field.options}
              onValueChange={(value) => onFieldChange?.(index, value)}
              className="rounded-[999px] px-6 py-3"
            />
          </DesktopFieldShell>
        ))
      )}

      <Link
        href={ctaHref}
        aria-label={ctaLabel}
        className="mt-[30px] inline-flex h-[66px] w-[66px] items-center justify-center justify-self-center rounded-[22px] bg-[#ff6624] text-white shadow-[0_10px_0_0_rgba(11,31,62,0.4)] transition hover:translate-y-[1px] hover:shadow-[0_8px_0_0_rgba(11,31,62,0.38)]"
      >
        <SearchActionIcon className="h-6 w-6" />
        <span className="sr-only">{ctaLabel}</span>
      </Link>
    </div>
  )
}

type FlightOneWayDesktopSearchProps = {
  ctaHref: string
  ctaLabel: string
  fields: HeroRenderedField[]
  onFieldChange?: (index: number, value: string) => void
  onSwap?: () => void
}

function FlightOneWayDesktopSearch({ ctaHref, ctaLabel, fields, onFieldChange, onSwap }: FlightOneWayDesktopSearchProps) {
  const [originField, destinationField, departureField, passengerField] = fields
  const originDisplay = splitAirportValue(originField.value)
  const destinationDisplay = splitAirportValue(destinationField.value)

  return (
    <div className="relative hidden overflow-visible lg:block">
      <div className="mt-6 grid grid-cols-[286px_56px_286px_258px_282px_84px] items-end gap-x-5">
        <DesktopFieldShell label="Dari">
          <HeroSearchField
            label={originField.label}
            value={originField.value}
            sublabel={originField.sublabel ?? ""}
            hideLabel
            hideSublabel
            variant="searchbox-desktop"
            inputType={originField.inputType}
            options={originField.options}
            onValueChange={(value) => onFieldChange?.(0, value)}
            className="rounded-[999px] px-7 py-[17px]"
            renderValue={
              <AirportValue
                code={originDisplay.code}
                city={originDisplay.city}
                icon={<SearchMiniIcon className="h-5 w-5" />}
              />
            }
          />
        </DesktopFieldShell>

        <button type="button" onClick={onSwap} className="relative mb-[11px] flex h-[54px] w-[56px] items-center justify-center text-[#ff5a43]">
          <span className="absolute left-0 top-1/2 h-9 w-px -translate-y-1/2 bg-[#dfe7f1]" />
          <SwapIcon className="h-[16px] w-[16px]" />
          <span className="absolute right-0 top-1/2 h-9 w-px -translate-y-1/2 bg-[#dfe7f1]" />
        </button>

        <DesktopFieldShell label="Ke">
          <HeroSearchField
            label={destinationField.label}
            value={destinationField.value}
            sublabel={destinationField.sublabel ?? ""}
            hideLabel
            hideSublabel
            variant="searchbox-desktop"
            inputType={destinationField.inputType}
            options={destinationField.options}
            onValueChange={(value) => onFieldChange?.(1, value)}
            className="rounded-[999px] px-7 py-[17px]"
            renderValue={
              <AirportValue
                code={destinationDisplay.code}
                city={destinationDisplay.city}
                icon={<SearchMiniIcon className="h-5 w-5" />}
              />
            }
          />
        </DesktopFieldShell>

        <DesktopFieldShell label="Tanggal Pergi">
          <HeroSearchField
            label={departureField.label}
            value={departureField.value}
            sublabel={departureField.sublabel ?? ""}
            hideLabel
            hideSublabel
            variant="searchbox-desktop"
            inputType={departureField.inputType}
            options={departureField.options}
            onValueChange={(value) => onFieldChange?.(2, value)}
            className="rounded-[999px] px-7 py-[17px]"
            renderValue={<SingleLineValue value={formatIsoToSlashDateSafe(departureField.value)} icon={<CalendarMiniIcon className="h-5 w-5" />} />}
          />
        </DesktopFieldShell>

        <DesktopFieldShell label="Tanggal Pulang">
          <HeroSearchField
            label={passengerField.label}
            value={passengerField.value}
            sublabel={passengerField.sublabel ?? ""}
            hideLabel
            hideSublabel
            withChevron={passengerField.withChevron}
            variant="searchbox-desktop"
            inputType={passengerField.inputType}
            options={passengerField.options}
            onValueChange={(value) => onFieldChange?.(3, value)}
            className="rounded-[999px] px-7 py-[17px]"
            renderValue={<SingleLineValue value={passengerField.value} icon={<ChevronDownIcon className="h-5 w-5" />} iconTone="text-[#7385a0]" />}
          />
        </DesktopFieldShell>

        <Link
          href={ctaHref}
          aria-label={ctaLabel}
          className="mb-[10px] inline-flex h-[66px] w-[66px] items-center justify-center rounded-[22px] bg-[#ff6624] text-white shadow-[0_12px_0_0_rgba(100,114,135,0.6)] transition hover:translate-y-[1px] hover:shadow-[0_10px_0_0_rgba(100,114,135,0.56)]"
        >
          <SearchActionIcon className="h-6 w-6" />
          <span className="sr-only">{ctaLabel}</span>
        </Link>
      </div>
    </div>
  )
}

function DesktopFieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[10px]">
      <p className="pl-3 text-[15px] font-semibold tracking-[-0.01em] text-[#42526b]">{label}</p>
      {children}
    </div>
  )
}

function SearchActionIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path strokeLinecap="round" d="M16 16l4 4" />
    </svg>
  )
}

function SearchMiniIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path strokeLinecap="round" d="M16 16l4 4" />
    </svg>
  )
}

function CalendarMiniIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
      <rect x="4" y="6" width="16" height="14" rx="2.5" />
      <path strokeLinecap="round" d="M8 4v4M16 4v4M4 10h16" />
    </svg>
  )
}

function AirportValue({ code, city, icon }: { code: string; city: string; icon: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="min-w-0 truncate text-[16px] font-semibold tracking-[-0.01em] text-[#17263c]">
        <span className="mr-5 inline-block min-w-[40px]">{code}</span>
        <span>{city}</span>
      </span>
      <span className="shrink-0 text-[#90a2b9]">{icon}</span>
    </div>
  )
}

function SingleLineValue({
  value,
  icon,
  iconTone = "text-[#111111]",
}: {
  value: string
  icon: ReactNode
  iconTone?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="min-w-0 truncate text-[16px] font-semibold tracking-[-0.01em] text-[#17263c]">{value}</span>
      <span className={`shrink-0 ${iconTone}`}>{icon}</span>
    </div>
  )
}

function splitAirportValue(input: string) {
  const match = input.match(/^([A-Z]{3})\s+(.*)$/)
  if (!match) return { code: "", city: input }
  return { code: match[1], city: match[2] }
}

function formatIsoToSlashDateSafe(input: string) {
  const [year, month, day] = input.split("-")
  if (!year || !month || !day) return input
  return `${day}/${month}/${year}`
}
