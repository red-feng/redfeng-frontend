import { ChevronDownIcon, SwapIcon } from "@/app/components/home/homeContent"

type HeroSearchFieldProps = {
  label: string
  value: string
  sublabel: string
  withSwap?: boolean
  withChevron?: boolean
  compact?: boolean
}

export default function HeroSearchField({
  label,
  value,
  sublabel,
  withSwap = false,
  withChevron = false,
  compact = false,
}: HeroSearchFieldProps) {
  return (
    <div className={`relative bg-[#fdfefe] ${compact ? "min-h-[108px] border-r border-t border-slate-200 px-4 py-4 first:rounded-bl-[20px] lg:min-h-0 lg:rounded-[20px] lg:border lg:px-4 lg:py-3.5" : "border-t border-slate-200 px-4 py-4 first:rounded-t-[20px] last:border-b lg:rounded-[20px] lg:border lg:px-4 lg:py-3.5"}`}>
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="mt-2 pr-8 text-[15px] font-bold text-slate-900">{value}</p>
      {sublabel ? <p className="mt-1 text-[11px] text-slate-400">{sublabel}</p> : <p className="mt-1 text-[11px] text-transparent">.</p>}
      {withSwap ? (
        <span className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1f2937] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.4)] lg:hidden">
          <SwapIcon className="h-4 w-4" />
        </span>
      ) : null}
      {withChevron ? (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
          <ChevronDownIcon className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  )
}
