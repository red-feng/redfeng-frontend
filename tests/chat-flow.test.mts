import assert from "node:assert/strict"
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

console.log("Chat flow regression checks passed.")
