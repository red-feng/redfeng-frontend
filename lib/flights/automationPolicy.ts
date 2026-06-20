type FlightAutomationInput = {
  airlineCode?: string | null
  airlineName?: string | null
  supplierCode?: string | null
  integrationMode?: string | null
}

export type FlightAutomationPolicy = {
  productType: "flight"
  supplierCode: string
  airlineGroup: "default" | "airasia"
  autoHold: boolean
  autoIssueAfterPayment: boolean
  paymentBeforeSupplierAction: boolean
  manualReviewRequired: boolean
  reason: string
}

function normalize(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

export function isAirAsiaFlight(input: Pick<FlightAutomationInput, "airlineCode" | "airlineName">) {
  const airlineCode = normalize(input.airlineCode).replace(/\s+/g, "")
  const airlineName = normalize(input.airlineName)
  return airlineCode === "qz" || airlineCode === "ak" || airlineCode === "fd" || airlineName.includes("airasia") || airlineName.includes("air asia")
}

export function getFlightAutomationPolicy(input: FlightAutomationInput): FlightAutomationPolicy {
  const supplierCode = String(input.supplierCode || "").trim().toUpperCase() || "UNKNOWN"
  const apiReady = normalize(input.integrationMode) === "api"

  if (isAirAsiaFlight(input)) {
    return {
      productType: "flight",
      supplierCode,
      airlineGroup: "airasia",
      autoHold: false,
      autoIssueAfterPayment: false,
      paymentBeforeSupplierAction: true,
      manualReviewRequired: true,
      reason: "AirAsia dikecualikan dari flow hold normal Dharmawisata. Tahan manual untuk menghindari risiko saldo/deposit.",
    }
  }

  return {
    productType: "flight",
    supplierCode,
    airlineGroup: "default",
    autoHold: apiReady,
    autoIssueAfterPayment: apiReady,
    paymentBeforeSupplierAction: false,
    manualReviewRequired: !apiReady,
    reason: apiReady
      ? "Airline default Dharmawisata: booking/hold tidak memotong deposit, issue dijalankan setelah payment verified."
      : "Supplier belum API-ready, jadi booking/issue perlu manual review.",
  }
}
