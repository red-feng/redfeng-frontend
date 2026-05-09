import Link from "next/link"
import HeroSearchField from "@/app/components/home/web/hero/HeroSearchField"
import type { HeroSearchConfig } from "@/app/components/home/web/hero/heroSearchContent"
import type { Locale } from "@/lib/i18n"

type HeroRenderedField = HeroSearchConfig["mobileFields"][number] & {
  inputType: "text" | "date" | "select" | "autocomplete"
  options?: { label: string; value: string; sublabel?: string }[]
}

type HeroSearchMobileProps = {
  config: HeroSearchConfig
  fields?: HeroRenderedField[]
  onFieldChange?: (index: number, value: string) => void
  onSwap?: () => void
  locale: Locale
}

export default function HeroSearchMobile({ config, fields, onFieldChange, onSwap, locale }: HeroSearchMobileProps) {
  const mobileFields = fields ?? config.mobileFields
  const primaryFields = mobileFields.slice(0, config.mobilePrimaryCount)
  const compactFields = mobileFields.slice(config.mobilePrimaryCount)
  const compactGridClass = compactFields.length === 2 ? "grid-cols-2" : "grid-cols-3"

  return (
    <div className="lg:hidden">
      {primaryFields.map((field, index) => (
        <HeroSearchField
          key={field.label}
          label={field.label}
          displayLabel={field.displayLabel}
          value={field.value}
          displayValue={field.displayValue}
          sublabel={field.sublabel ?? ""}
          displaySublabel={field.displaySublabel}
          withChevron={field.withChevron}
          withSwap={field.withSwap}
          inputType={field.inputType}
          options={field.options}
          onValueChange={(value) => onFieldChange?.(index, value)}
          onSwap={field.withSwap ? onSwap : undefined}
          locale={locale}
          className="rounded-[22px] border-[#dce5f0] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
        />
      ))}

      {compactFields.length > 0 ? (
        <div className={`mt-3 grid gap-3 ${compactGridClass}`}>
          {compactFields.map((field, index) => (
            <HeroSearchField
              key={field.label}
              label={field.label}
              displayLabel={field.displayLabel}
              value={field.value}
              displayValue={field.displayValue}
              sublabel={field.sublabel ?? ""}
              displaySublabel={field.displaySublabel}
              withChevron={field.withChevron}
              compact
              inputType={field.inputType}
              options={field.options}
              onValueChange={(value) => onFieldChange?.(index + config.mobilePrimaryCount, value)}
              locale={locale}
              className="rounded-[20px] border border-[#dce5f0] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
            />
          ))}
        </div>
      ) : null}

      <Link
        href={config.ctaHref}
        aria-label={config.ctaLabel}
        className="mt-5 inline-flex h-[60px] w-[60px] items-center justify-center rounded-[20px] bg-[#ff6624] text-white shadow-[0_10px_0_0_rgba(11,31,62,0.38)] transition hover:translate-y-[1px] hover:shadow-[0_8px_0_0_rgba(11,31,62,0.34)]"
      >
        <SearchActionIcon className="h-[22px] w-[22px]" />
        <span className="sr-only">{config.ctaLabel}</span>
      </Link>
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
