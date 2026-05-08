import Link from "next/link"
import HeroSearchField from "@/app/components/home/web/hero/HeroSearchField"
import type { HeroSearchConfig } from "@/app/components/home/web/hero/heroSearchContent"

type HeroRenderedField = HeroSearchConfig["mobileFields"][number] & {
  inputType: "text" | "date" | "select" | "autocomplete"
  options?: { label: string; value: string; sublabel?: string }[]
}

type HeroSearchMobileProps = {
  config: HeroSearchConfig
  fields?: HeroRenderedField[]
  onFieldChange?: (index: number, value: string) => void
  onSwap?: () => void
}

export default function HeroSearchMobile({ config, fields, onFieldChange, onSwap }: HeroSearchMobileProps) {
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
          value={field.value}
          sublabel={field.sublabel ?? ""}
          withChevron={field.withChevron}
          withSwap={field.withSwap}
          inputType={field.inputType}
          options={field.options}
          onValueChange={(value) => onFieldChange?.(index, value)}
          onSwap={field.withSwap ? onSwap : undefined}
          className="rounded-[22px] border-[#dce5f0] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
        />
      ))}

      {compactFields.length > 0 ? (
        <div className={`mt-3 grid gap-3 ${compactGridClass}`}>
          {compactFields.map((field, index) => (
            <HeroSearchField
              key={field.label}
              label={field.label}
              value={field.value}
              sublabel={field.sublabel ?? ""}
              withChevron={field.withChevron}
              compact
              inputType={field.inputType}
              options={field.options}
              onValueChange={(value) => onFieldChange?.(index + config.mobilePrimaryCount, value)}
              className="rounded-[20px] border border-[#dce5f0] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
            />
          ))}
        </div>
      ) : null}

      <Link href={config.ctaHref} className="mt-5 inline-flex min-h-[56px] w-full items-center justify-center rounded-[18px] bg-[#ff5a43] px-10 text-[15px] font-semibold text-white shadow-[0_18px_38px_-24px_rgba(255,90,67,0.85)]">
        {config.ctaLabel}
      </Link>
    </div>
  )
}
