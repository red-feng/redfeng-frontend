import Link from "next/link"
import HeroSearchField from "@/app/components/home/web/hero/HeroSearchField"
import { SwapIcon } from "@/app/components/home/shared/homeContent"
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
  const desktopFields = fields ?? config.desktopFields

  return (
    <div className={desktopGridClass}>
      {showDesktopSwap ? (
        <>
          <HeroSearchField
            label={desktopFields[0].label}
            value={desktopFields[0].value}
            sublabel={desktopFields[0].sublabel ?? ""}
            inputType={desktopFields[0].inputType}
            options={desktopFields[0].options}
            onValueChange={(value) => onFieldChange?.(0, value)}
          />
          <button type="button" onClick={onSwap} className="mx-auto hidden h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#ff5a43] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.24)] transition hover:border-[#ffd4cb] hover:bg-[#fff4f1] lg:flex">
            <SwapIcon className="h-4 w-4" />
          </button>
          <HeroSearchField
            label={desktopFields[1].label}
            value={desktopFields[1].value}
            sublabel={desktopFields[1].sublabel ?? ""}
            inputType={desktopFields[1].inputType}
            options={desktopFields[1].options}
            onValueChange={(value) => onFieldChange?.(1, value)}
          />
          {desktopFields.slice(2).map((field, index) => (
            <HeroSearchField
              key={field.label}
              label={field.label}
              value={field.value}
              sublabel={field.sublabel ?? ""}
              withChevron={field.withChevron}
              inputType={field.inputType}
              options={field.options}
              onValueChange={(value) => onFieldChange?.(index + 2, value)}
            />
          ))}
        </>
      ) : (
        desktopFields.map((field, index) => (
          <HeroSearchField
            key={field.label}
            label={field.label}
            value={field.value}
            sublabel={field.sublabel ?? ""}
            withChevron={field.withChevron}
            inputType={field.inputType}
            options={field.options}
            onValueChange={(value) => onFieldChange?.(index, value)}
          />
        ))
      )}

      <Link href={ctaHref} className="inline-flex min-h-[76px] items-center justify-center whitespace-nowrap rounded-2xl bg-[#ff5a43] px-10 text-[16px] font-semibold text-white shadow-[0_18px_38px_-24px_rgba(255,90,67,0.85)]">
        {ctaLabel}
      </Link>
    </div>
  )
}
