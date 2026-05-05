import Link from "next/link"
import HeroSearchField from "@/app/components/home/HeroSearchField"
import type { HeroSearchConfig } from "@/app/components/home/heroSearchContent"

type HeroSearchMobileProps = {
  config: HeroSearchConfig
  fields?: HeroSearchConfig["mobileFields"]
  onFieldClick?: (index: number) => void
  onSwap?: () => void
}

export default function HeroSearchMobile({ config, fields, onFieldClick, onSwap }: HeroSearchMobileProps) {
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
          interactive
          onClick={field.withSwap ? onSwap : () => onFieldClick?.(index)}
        />
      ))}

      {compactFields.length > 0 ? (
        <div className={`grid ${compactGridClass}`}>
          {compactFields.map((field, index) => (
            <HeroSearchField
              key={field.label}
              label={field.label}
              value={field.value}
              sublabel={field.sublabel ?? ""}
              withChevron={field.withChevron}
              compact
              interactive
              onClick={() => onFieldClick?.(index + config.mobilePrimaryCount)}
            />
          ))}
        </div>
      ) : null}

      <Link href={config.ctaHref} className="mt-5 inline-flex min-h-[54px] w-full items-center justify-center rounded-[14px] bg-[#ff3a31] px-10 text-[15px] font-semibold text-white shadow-[0_18px_38px_-24px_rgba(255,90,67,0.85)]">
        {config.ctaLabel}
      </Link>
    </div>
  )
}
