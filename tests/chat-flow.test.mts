import assert from "node:assert/strict"
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

console.log("Chat flow regression checks passed.")
