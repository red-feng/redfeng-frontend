import { createAdminClient } from "@/lib/supabase/admin"
import {
  dharmawisataPartnerAirlines,
  dharmawisataReferenceAirports,
  dharmawisataVerifiedLiveRoutes,
  type SupplierVerifiedRoute,
} from "@/lib/flights/dharmawisataSupplierCatalog"

const DHARMAWISATA_SUPPLIER_CODE = "DHARMAWISATA_H2H"

type SupplierLookupRow = {
  id: string
}

type SupplierRouteVerificationRow = {
  origin_code: string
  destination_code: string
  airline_codes: string[] | null
  verified_dates: string[] | null
  lowest_observed_fare_idr: number | null
  availability_status: SupplierVerifiedRoute["availabilityStatus"]
  verification_environment: SupplierVerifiedRoute["verificationEnvironment"]
}

type SupplierRouteCoverageSummary = {
  verifiedRoutes: SupplierVerifiedRoute[]
  source: "database" | "fallback"
}

export async function loadDharmawisataRouteCoverage(): Promise<SupplierRouteCoverageSummary> {
  try {
    const adminSupabase = createAdminClient()
    const { data: supplier } = await adminSupabase
      .from("suppliers")
      .select("id")
      .eq("supplier_code", DHARMAWISATA_SUPPLIER_CODE)
      .maybeSingle<SupplierLookupRow>()

    if (!supplier?.id) {
      return {
        verifiedRoutes: dharmawisataVerifiedLiveRoutes,
        source: "fallback",
      }
    }

    const { data, error } = await adminSupabase
      .from("supplier_route_verifications")
      .select("origin_code, destination_code, airline_codes, verified_dates, lowest_observed_fare_idr, availability_status, verification_environment")
      .eq("supplier_id", supplier.id)
      .eq("product_type", "flight")
      .order("origin_code", { ascending: true })
      .order("destination_code", { ascending: true })

    if (error || !data?.length) {
      return {
        verifiedRoutes: dharmawisataVerifiedLiveRoutes,
        source: "fallback",
      }
    }

    return {
      verifiedRoutes: (data as SupplierRouteVerificationRow[]).map((row) => ({
        originCode: row.origin_code,
        destinationCode: row.destination_code,
        airlineCodes: row.airline_codes || [],
        verifiedDates: row.verified_dates || [],
        lowestObservedFareIdr: row.lowest_observed_fare_idr,
        availabilityStatus: row.availability_status,
        verificationEnvironment: row.verification_environment,
      })),
      source: "database",
    }
  } catch {
    return {
      verifiedRoutes: dharmawisataVerifiedLiveRoutes,
      source: "fallback",
    }
  }
}

export async function loadDharmawisataCoverageSummary() {
  const routeCoverage = await loadDharmawisataRouteCoverage()
  const environments = Array.from(
    new Set(routeCoverage.verifiedRoutes.map((route) => route.verificationEnvironment)),
  )
  const statuses = Array.from(
    new Set([
      ...dharmawisataPartnerAirlines.map((entry) => entry.availabilityStatus),
      ...routeCoverage.verifiedRoutes.map((entry) => entry.availabilityStatus),
    ]),
  )

  return {
    airlineCount: dharmawisataPartnerAirlines.length,
    airportCount: dharmawisataReferenceAirports.length,
    verifiedRouteCount: routeCoverage.verifiedRoutes.length,
    environments,
    statuses,
    source: routeCoverage.source,
    verifiedRoutes: routeCoverage.verifiedRoutes,
  }
}
