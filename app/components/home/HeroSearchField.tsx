import { ChevronDownIcon, SwapIcon } from "@/app/components/home/homeContent"

type HeroSearchFieldOption = {
  label: string
  value: string
}

type HeroSearchFieldProps = {
  className?: string
  label: string
  value: string
  sublabel: string
  withSwap?: boolean
  withChevron?: boolean
  compact?: boolean
  inputType?: "text" | "date" | "select"
  options?: HeroSearchFieldOption[]
  onValueChange?: (value: string) => void
  onSwap?: () => void
}

export default function HeroSearchField({
  className = "",
  label,
  value,
  sublabel,
  withSwap = false,
  withChevron = false,
  compact = false,
  inputType = "text",
  options = [],
  onValueChange,
  onSwap,
}: HeroSearchFieldProps) {
  const fieldShellClass = `relative w-full bg-[#fdfefe] ${compact ? "min-h-[108px] border-r border-t border-slate-200 px-4 py-4 first:rounded-bl-[20px] lg:min-h-0 lg:rounded-[20px] lg:border lg:px-4 lg:py-3.5" : "border-t border-slate-200 px-4 py-4 first:rounded-t-[20px] last:border-b lg:rounded-[20px] lg:border lg:px-4 lg:py-3.5"} ${className}`

  return (
    <div className={fieldShellClass}>
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      {inputType === "select" ? (
        <select
          value={value}
          onChange={(event) => onValueChange?.(event.target.value)}
          className="mt-2 w-full appearance-none bg-transparent pr-8 text-[15px] font-bold text-slate-900 outline-none"
        >
          {options.map((option) => (
            <option key={`${label}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : inputType === "date" ? (
        <input
          type="date"
          value={value}
          onChange={(event) => onValueChange?.(event.target.value)}
          className="mt-2 w-full bg-transparent pr-8 text-[15px] font-bold text-slate-900 outline-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onValueChange?.(event.target.value)}
          className="mt-2 w-full bg-transparent pr-8 text-[15px] font-bold text-slate-900 outline-none placeholder:text-slate-300"
        />
      )}
      {sublabel ? <p className="mt-1 text-[11px] text-slate-400">{sublabel}</p> : <p className="mt-1 text-[11px] text-transparent">.</p>}
      {withSwap ? (
        <button
          type="button"
          onClick={onSwap}
          className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1f2937] shadow-[0_12px_24px_-18px_rgba(15,23,42,0.4)] transition hover:border-[#ffd4cb] hover:bg-[#fff4f1] lg:hidden"
        >
          <SwapIcon className="h-4 w-4" />
        </button>
      ) : null}
      {withChevron ? (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
          <ChevronDownIcon className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  )
}
