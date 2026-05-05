import Link from "next/link"
import HeroSearchField from "@/app/components/home/HeroSearchField"
import type { HeroSearchConfig } from "@/app/components/home/heroSearchContent"
import { SwapIcon } from "@/app/components/home/homeContent"

type HeroSearchDesktopProps = {
  config: HeroSearchConfig
}

export default function HeroSearchDesktop({ config }: HeroSearchDesktopProps) {
  const { ctaHref, ctaLabel, desktopFields, desktopGridClass, showDesktopSwap = false } = config

  return (
    <div className={desktopGridClass}>
      {showDesktopSwap ? (
        <>
          <HeroSearchField label={desktopFields[0].label} value={desktopFields[0].value} sublabel={desktopFields[0].sublabel ?? ""} />
          <button type="button" className="mx-auto hidden h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#ff5a43] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.24)] lg:flex">
            <SwapIcon className="h-4 w-4" />
          </button>
          <HeroSearchField label={desktopFields[1].label} value={desktopFields[1].value} sublabel={desktopFields[1].sublabel ?? ""} />
          {desktopFields.slice(2).map((field) => (
            <HeroSearchField
              key={field.label}
              label={field.label}
              value={field.value}
              sublabel={field.sublabel ?? ""}
              withChevron={field.withChevron}
            />
          ))}
        </>
      ) : (
        desktopFields.map((field) => (
          <HeroSearchField
            key={field.label}
            label={field.label}
            value={field.value}
            sublabel={field.sublabel ?? ""}
            withChevron={field.withChevron}
          />
        ))
      )}

      <Link href={ctaHref} className="inline-flex min-h-[76px] items-center justify-center whitespace-nowrap rounded-2xl bg-[#ff5a43] px-10 text-[16px] font-semibold text-white shadow-[0_18px_38px_-24px_rgba(255,90,67,0.85)]">
        {ctaLabel}
      </Link>
    </div>
  )
}
