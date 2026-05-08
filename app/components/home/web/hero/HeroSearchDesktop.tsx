import type { ReactNode } from "react"
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
  const fourthLabel = config.activeOption === "one_way" ? "Tanggal Pulang" : desktopFields[3]?.label

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
          <button type="button" onClick={onSwap} className="relative mx-auto hidden h-[66px] w-[64px] items-center justify-center text-[#ff5a43] lg:flex">
            <span className="absolute left-[10px] top-1/2 h-7 w-px -translate-y-1/2 bg-[#e5ebf2]" />
            <SwapIcon className="h-[15px] w-[15px]" />
            <span className="absolute right-[10px] top-1/2 h-7 w-px -translate-y-1/2 bg-[#e5ebf2]" />
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
            <DesktopFieldShell key={field.label} label={index === 1 && fourthLabel ? fourthLabel : field.label}>
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

      <Link href={ctaHref} className="mt-[30px] inline-flex min-h-[66px] w-full items-center justify-center whitespace-nowrap rounded-[20px] bg-[#ff5a43] px-16 text-[18px] font-semibold text-white shadow-[0_16px_28px_-18px_rgba(255,90,67,0.78)]">
        {ctaLabel}
      </Link>
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
