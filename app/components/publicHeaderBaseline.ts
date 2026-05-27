// Baseline canonical for full public headers.
// New public pages should use `PublicHeader` so logo/menu spacing stays aligned
// with the `/packages` header that has been approved as the shared reference.
export const publicHeaderBaseline = {
  desktopShellClass: "relative mx-auto max-w-7xl px-4 md:px-6",
  desktopOverlayPaddingClass: "pt-5 md:pt-6",
  desktopDefaultPaddingClass: "py-3 md:py-4",
  desktopLogoAnchorClass: "absolute left-8 top-5 inline-flex h-[5.75rem] w-[15.5rem] items-start gap-2 overflow-visible",
  desktopOverlayLogoLiftClass: "-translate-y-[15%]",
  desktopLocaleTone: "glass-dark",
} as const
