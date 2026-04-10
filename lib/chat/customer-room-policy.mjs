/**
 * @typedef {"reuse_booking_room" | "link_existing_package_room" | "create_booking_room"} BookingRoomResolutionStrategy
 */

/**
 * @param {{ hasExistingBookingRoom: boolean; hasExistingPackageRoom: boolean }} params
 * @returns {BookingRoomResolutionStrategy}
 */
export function decideBookingRoomResolution(params) {
  if (params.hasExistingBookingRoom) return "reuse_booking_room"
  if (params.hasExistingPackageRoom) return "link_existing_package_room"
  return "create_booking_room"
}

/**
 * @typedef {"reuse_package_room" | "create_package_room"} PackageRoomResolutionStrategy
 */

/**
 * @param {{ hasExistingPackageRoom: boolean }} params
 * @returns {PackageRoomResolutionStrategy}
 */
export function decidePackageRoomResolution(params) {
  return params.hasExistingPackageRoom ? "reuse_package_room" : "create_package_room"
}

/**
 * @param {{ activePortal: string; hasMerchantRecord: boolean }} params
 */
export function shouldUseMerchantChatPortal(params) {
  return params.activePortal === "merchant" && params.hasMerchantRecord
}
