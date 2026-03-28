type ToneVariant = "soft" | "bordered"

function normalizeStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase()
}

function toneClass(
  tone: "success" | "pending" | "progress" | "danger" | "neutral",
  variant: ToneVariant = "soft",
) {
  if (tone === "success") {
    return variant === "bordered"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "bg-emerald-50 text-emerald-700"
  }

  if (tone === "pending") {
    return variant === "bordered"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "bg-amber-50 text-amber-700"
  }

  if (tone === "progress") {
    return variant === "bordered"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "bg-sky-50 text-sky-700"
  }

  if (tone === "danger") {
    return variant === "bordered"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "bg-rose-50 text-rose-700"
  }

  return variant === "bordered"
    ? "border-slate-200 bg-slate-100 text-slate-700"
    : "bg-slate-100 text-slate-700"
}

export function getPaymentStatusTone(value: string | null | undefined, variant: ToneVariant = "soft") {
  const status = normalizeStatus(value)
  if (status === "paid") return toneClass("success", variant)
  if (status === "dp_paid" || status === "pending") return toneClass("pending", variant)
  if (status === "cancelled" || status === "refund" || status === "rejected") return toneClass("danger", variant)
  return toneClass("neutral", variant)
}

export function getEscrowStatusTone(value: string | null | undefined, variant: ToneVariant = "soft") {
  const status = normalizeStatus(value)
  if (status === "held" || status === "partial_hold") return toneClass("danger", variant)
  if (
    status === "awaiting_admin_handoff" ||
    status === "ready_for_payout" ||
    status === "finance_review" ||
    status === "finance_processing" ||
    status === "payout_processing" ||
    status === "payout_completed"
  ) {
    return toneClass("progress", variant)
  }
  if (status === "paid_out") return toneClass("success", variant)
  return toneClass("neutral", variant)
}

export function getPayoutRequestTone(value: string | null | undefined, variant: ToneVariant = "soft") {
  const status = normalizeStatus(value)
  if (status === "paid" || status === "completed") return toneClass("success", variant)
  if (status === "approved" || status === "processing") return toneClass("progress", variant)
  if (status === "pending") return toneClass("pending", variant)
  if (status === "rejected" || status === "cancelled") return toneClass("danger", variant)
  return toneClass("neutral", variant)
}

export function getJourneyStageTone(
  stage:
    | "paid_out"
    | "ready_for_finance"
    | "go_confirmed"
    | "picked_up"
    | "awaiting_pickup"
    | "fully_paid"
    | "dp_paid"
    | "fallback",
  variant: ToneVariant = "soft",
) {
  if (stage === "paid_out" || stage === "go_confirmed" || stage === "picked_up" || stage === "fully_paid") {
    return toneClass("success", variant)
  }
  if (stage === "ready_for_finance" || stage === "awaiting_pickup") {
    return toneClass("progress", variant)
  }
  if (stage === "dp_paid") {
    return toneClass("pending", variant)
  }
  return toneClass("neutral", variant)
}

export { normalizeStatus, toneClass }
