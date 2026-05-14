import assert from "node:assert/strict"
import { ADMIN_NAV_ROUTE_SECTION_MAP, ADMIN_NAV_SECTION_TO_COLUMN, isAdminNavSeenSection } from "../lib/admin-nav-seen.ts"
import { FINANCE_NAV_ROUTE_SECTION_MAP, FINANCE_NAV_SECTION_TO_COLUMN, isFinanceNavSeenSection } from "../lib/finance-nav-seen.ts"
import { MERCHANT_NAV_ROUTE_SECTION_MAP, MERCHANT_NAV_SECTION_TO_COLUMN, isMerchantNavSeenSection } from "../lib/merchant-nav-seen.ts"
import {
  buildChatLoginNextTarget,
  shouldMarkRoomReadOnActivation,
  shouldRefreshPublicAuthShell,
} from "../lib/chat/auth-flow-policy.mjs"
import {
  decideBookingRoomResolution,
  decidePackageRoomResolution,
  shouldUseMerchantChatPortal,
} from "../lib/chat/customer-room-policy.mjs"
import {
  SUPERADMIN_NAV_ROUTE_SECTION_MAP,
  SUPERADMIN_NAV_SECTION_TO_COLUMN,
  isSuperadminNavSeenSection,
} from "../lib/superadmin-nav-seen.ts"

function runCase(name: string, fn: () => void) {
  try {
    fn()
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    throw error
  }
}

runCase("booking chat keeps existing booking room", () => {
  assert.equal(
    decideBookingRoomResolution({
      hasExistingBookingRoom: true,
      hasExistingPackageRoom: true,
    }),
    "reuse_booking_room",
  )
})

runCase("booking chat links existing package room before creating new room", () => {
  assert.equal(
    decideBookingRoomResolution({
      hasExistingBookingRoom: false,
      hasExistingPackageRoom: true,
    }),
    "link_existing_package_room",
  )
})

runCase("booking chat creates new room only as last fallback", () => {
  assert.equal(
    decideBookingRoomResolution({
      hasExistingBookingRoom: false,
      hasExistingPackageRoom: false,
    }),
    "create_booking_room",
  )
})

runCase("package chat reuses existing package room", () => {
  assert.equal(
    decidePackageRoomResolution({
      hasExistingPackageRoom: true,
    }),
    "reuse_package_room",
  )
})

runCase("package chat creates room only when needed", () => {
  assert.equal(
    decidePackageRoomResolution({
      hasExistingPackageRoom: false,
    }),
    "create_package_room",
  )
})

runCase("customer portal stays customer even if account also has merchant access", () => {
  assert.equal(
    shouldUseMerchantChatPortal({
      activePortal: "customer",
      hasMerchantRecord: true,
    }),
    false,
  )
})

runCase("merchant mode activates only with explicit merchant portal", () => {
  assert.equal(
    shouldUseMerchantChatPortal({
      activePortal: "merchant",
      hasMerchantRecord: true,
    }),
    true,
  )
})

runCase("merchant portal flag without merchant record stays false", () => {
  assert.equal(
    shouldUseMerchantChatPortal({
      activePortal: "merchant",
      hasMerchantRecord: false,
    }),
    false,
  )
})

runCase("chat login redirect prefers booking target", () => {
  assert.equal(
    buildChatLoginNextTarget({
      bookingId: "booking-123",
      packageId: "pkg-123",
      roomId: "room-123",
    }),
    "/chat?booking_id=booking-123",
  )
})

runCase("chat login redirect falls back to package target", () => {
  assert.equal(
    buildChatLoginNextTarget({
      packageId: "pkg-123",
      roomId: "room-123",
    }),
    "/chat?package_id=pkg-123",
  )
})

runCase("public header refreshes only on meaningful auth events", () => {
  assert.equal(shouldRefreshPublicAuthShell("SIGNED_IN"), true)
  assert.equal(shouldRefreshPublicAuthShell("SIGNED_OUT"), true)
  assert.equal(shouldRefreshPublicAuthShell("USER_UPDATED"), true)
  assert.equal(shouldRefreshPublicAuthShell("TOKEN_REFRESHED"), false)
  assert.equal(shouldRefreshPublicAuthShell("INITIAL_SESSION"), false)
})

runCase("merchant inbox does not auto-read first default room selection", () => {
  assert.equal(
    shouldMarkRoomReadOnActivation({
      initialSelectionWasExplicit: false,
      hasAlreadySkippedInitialAutoRead: false,
    }),
    false,
  )
})

runCase("merchant inbox reads room after explicit selection", () => {
  assert.equal(
    shouldMarkRoomReadOnActivation({
      initialSelectionWasExplicit: true,
      hasAlreadySkippedInitialAutoRead: false,
    }),
    true,
  )
})

runCase("merchant inbox reads room after initial auto-skip has passed", () => {
  assert.equal(
    shouldMarkRoomReadOnActivation({
      initialSelectionWasExplicit: false,
      hasAlreadySkippedInitialAutoRead: true,
    }),
    true,
  )
})

runCase("merchant nav seen-state stays mapped to DB columns", () => {
  assert.deepEqual(MERCHANT_NAV_SECTION_TO_COLUMN, {
    packages: "seen_packages_at",
    orders: "seen_orders_at",
    calendar: "seen_calendar_at",
    payout: "seen_payout_at",
    review: "seen_review_at",
  })
  assert.equal(isMerchantNavSeenSection("packages"), true)
  assert.equal(isMerchantNavSeenSection("browser_cookie"), false)
})

runCase("merchant nav route mapping stays stable", () => {
  assert.deepEqual(MERCHANT_NAV_ROUTE_SECTION_MAP, [
    { prefix: "/merchant/paket", section: "packages" },
    { prefix: "/merchant/pesanan", section: "orders" },
    { prefix: "/merchant/kalender-booking", section: "calendar" },
    { prefix: "/merchant/saldo-payout", section: "payout" },
    { prefix: "/merchant/review", section: "review" },
  ])
})

runCase("admin nav seen-state stays mapped to DB columns", () => {
  assert.deepEqual(ADMIN_NAV_SECTION_TO_COLUMN, {
    merchants: "seen_merchants_at",
    packages: "seen_packages_at",
    bookings: "seen_bookings_at",
  })
  assert.equal(isAdminNavSeenSection("bookings"), true)
  assert.equal(isAdminNavSeenSection("local_storage"), false)
})

runCase("finance nav seen-state stays mapped to DB columns", () => {
  assert.deepEqual(FINANCE_NAV_SECTION_TO_COLUMN, {
    refunds: "seen_refunds_at",
    payouts: "seen_payouts_at",
  })
  assert.equal(isFinanceNavSeenSection("refunds"), true)
  assert.equal(isFinanceNavSeenSection("cookie_only"), false)
})

runCase("superadmin nav seen-state stays mapped to DB columns", () => {
  assert.deepEqual(SUPERADMIN_NAV_SECTION_TO_COLUMN, {
    ops_accounts: "seen_ops_accounts_at",
    finance_accounts: "seen_finance_accounts_at",
    marketing_accounts: "seen_marketing_accounts_at",
    superadmin_accounts: "seen_superadmin_accounts_at",
    bookings: "seen_bookings_at",
    audit_log: "seen_audit_log_at",
  })
  assert.equal(isSuperadminNavSeenSection("audit_log"), true)
  assert.equal(isSuperadminNavSeenSection("session_storage"), false)
})

runCase("superadmin bridge keeps admin routes tied to superadmin seen-state", () => {
  assert.deepEqual(
    SUPERADMIN_NAV_ROUTE_SECTION_MAP.filter((entry) => entry.prefix.startsWith("/admin/")),
    [
      { prefix: "/admin/bookings", section: "bookings" },
      { prefix: "/admin/audit-log", section: "audit_log" },
    ],
  )
})

runCase("finance nav route mapping stays stable", () => {
  assert.deepEqual(FINANCE_NAV_ROUTE_SECTION_MAP, [
    { prefix: "/finance/refunds", section: "refunds" },
    { prefix: "/finance/payouts", section: "payouts" },
  ])
})

runCase("admin nav route mapping stays stable", () => {
  assert.deepEqual(ADMIN_NAV_ROUTE_SECTION_MAP, [
    { prefix: "/admin/merchants", section: "merchants" },
    { prefix: "/admin/packages", section: "packages" },
    { prefix: "/admin/bookings", section: "bookings" },
  ])
})

console.log("Chat and global account-state regression checks passed.")
