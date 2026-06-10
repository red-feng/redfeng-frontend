export type SupplierAirline = {
  code: string
  name: string
  availabilityStatus: SupplierAvailabilityStatus
}

export type SupplierAirport = {
  code: string
  city: string
  name: string
  countryCode: string
  availabilityStatus: SupplierAvailabilityStatus
}

export type SupplierVerifiedRoute = {
  originCode: string
  destinationCode: string
  airlineCodes: string[]
  verifiedDates: string[]
  lowestObservedFareIdr: number | null
  availabilityStatus: SupplierAvailabilityStatus
  verificationEnvironment: SupplierVerificationEnvironment
}

export type SupplierAvailabilityStatus =
  | "reference_available"
  | "uat_live_verified"
  | "production_live_verified"

export type SupplierVerificationEnvironment = "reference" | "uat" | "production"

export type SupplierCatalogStatusSummary = {
  airlineCount: number
  airportCount: number
  verifiedRouteCount: number
  statuses: SupplierAvailabilityStatus[]
  environments: SupplierVerificationEnvironment[]
}

export const dharmawisataPartnerAirlines: SupplierAirline[] = [
  { code: "QG", name: "Citilink", availabilityStatus: "reference_available" },
  { code: "QZ", name: "AirAsia", availabilityStatus: "reference_available" },
  { code: "JT", name: "Lion Air", availabilityStatus: "reference_available" },
]

export const dharmawisataReferenceAirports: SupplierAirport[] = [
  { code: "CGK", city: "Jakarta", name: "Soekarno Hatta", countryCode: "ID", availabilityStatus: "reference_available" },
  { code: "SUB", city: "Surabaya", name: "Juanda International", countryCode: "ID", availabilityStatus: "reference_available" },
  { code: "KNO", city: "Medan", name: "Kualanamu International", countryCode: "ID", availabilityStatus: "reference_available" },
  { code: "DPS", city: "Denpasar", name: "Ngurah Rai International", countryCode: "ID", availabilityStatus: "reference_available" },
  { code: "UPG", city: "Makassar", name: "Sultan Hasanuddin", countryCode: "ID", availabilityStatus: "reference_available" },
  { code: "JOG", city: "Yogyakarta", name: "Yogyakarta International", countryCode: "ID", availabilityStatus: "reference_available" },
  { code: "BDO", city: "Bandung", name: "Husein Sastranegara", countryCode: "ID", availabilityStatus: "reference_available" },
  { code: "BTH", city: "Batam", name: "Hang Nadim", countryCode: "ID", availabilityStatus: "reference_available" },
  { code: "PNK", city: "Pontianak", name: "Supadio", countryCode: "ID", availabilityStatus: "reference_available" },
  { code: "SRG", city: "Semarang", name: "Jenderal Ahmad Yani", countryCode: "ID", availabilityStatus: "reference_available" },
  { code: "AMI", city: "Mataram", name: "Zainuddin Abdul Madjid", countryCode: "ID", availabilityStatus: "reference_available" },
  { code: "LBJ", city: "Labuan Bajo", name: "Komodo", countryCode: "ID", availabilityStatus: "reference_available" },
  { code: "SIN", city: "Singapore", name: "Changi Airport", countryCode: "SG", availabilityStatus: "reference_available" },
  { code: "KUL", city: "Kuala Lumpur", name: "Kuala Lumpur International", countryCode: "MY", availabilityStatus: "reference_available" },
  { code: "BKK", city: "Bangkok", name: "Suvarnabhumi Airport", countryCode: "TH", availabilityStatus: "reference_available" },
  { code: "HKG", city: "Hong Kong", name: "Hong Kong International", countryCode: "HK", availabilityStatus: "reference_available" },
  { code: "HND", city: "Tokyo", name: "Haneda Airport", countryCode: "JP", availabilityStatus: "reference_available" },
  { code: "NRT", city: "Tokyo", name: "Narita International", countryCode: "JP", availabilityStatus: "reference_available" },
  { code: "ICN", city: "Seoul", name: "Incheon International", countryCode: "KR", availabilityStatus: "reference_available" },
  { code: "PVG", city: "Shanghai", name: "Pudong International", countryCode: "CN", availabilityStatus: "reference_available" },
  { code: "KIX", city: "Osaka", name: "Kansai International", countryCode: "JP", availabilityStatus: "reference_available" },
]

export const dharmawisataVerifiedLiveRoutes: SupplierVerifiedRoute[] = [
  {
    originCode: "CGK",
    destinationCode: "SUB",
    airlineCodes: ["QG"],
    verifiedDates: ["2026-06-24", "2026-06-26"],
    lowestObservedFareIdr: 351000,
    availabilityStatus: "uat_live_verified",
    verificationEnvironment: "uat",
  },
  {
    originCode: "SUB",
    destinationCode: "CGK",
    airlineCodes: ["QG", "QZ"],
    verifiedDates: ["2026-06-24"],
    lowestObservedFareIdr: 351000,
    availabilityStatus: "uat_live_verified",
    verificationEnvironment: "uat",
  },
  {
    originCode: "CGK",
    destinationCode: "KNO",
    airlineCodes: ["QG"],
    verifiedDates: ["2026-06-24"],
    lowestObservedFareIdr: 538000,
    availabilityStatus: "uat_live_verified",
    verificationEnvironment: "uat",
  },
]

export function getDharmawisataCatalogStatusSummary(): SupplierCatalogStatusSummary {
  const statuses = Array.from(
    new Set([
      ...dharmawisataPartnerAirlines.map((entry) => entry.availabilityStatus),
      ...dharmawisataReferenceAirports.map((entry) => entry.availabilityStatus),
      ...dharmawisataVerifiedLiveRoutes.map((entry) => entry.availabilityStatus),
    ]),
  )

  const environments = Array.from(
    new Set(dharmawisataVerifiedLiveRoutes.map((entry) => entry.verificationEnvironment)),
  )

  return {
    airlineCount: dharmawisataPartnerAirlines.length,
    airportCount: dharmawisataReferenceAirports.length,
    verifiedRouteCount: dharmawisataVerifiedLiveRoutes.length,
    statuses,
    environments,
  }
}

export function findDharmawisataVerifiedLiveRoute(
  originCode: string,
  destinationCode: string,
  date?: string,
) {
  const normalizedOrigin = originCode.trim().toUpperCase()
  const normalizedDestination = destinationCode.trim().toUpperCase()
  const normalizedDate = date?.trim()

  return (
    dharmawisataVerifiedLiveRoutes.find((entry) => {
      if (entry.originCode !== normalizedOrigin || entry.destinationCode !== normalizedDestination) {
        return false
      }

      if (!normalizedDate) return true
      return entry.verifiedDates.includes(normalizedDate)
    }) || null
  )
}

export function buildSupplierAirportSearchValue(code: string) {
  const airport = dharmawisataReferenceAirports.find((entry) => entry.code === code)
  if (!airport) return code
  return `${airport.city} (${airport.code})`
}
