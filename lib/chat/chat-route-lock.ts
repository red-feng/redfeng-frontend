export function buildLockedMerchantChatRedirect(params: {
  roomId?: string | null
  packageId?: string | null
  bookingId?: string | null
  errorMessage?: string | null
}) {
  const search = new URLSearchParams()
  if (params.roomId) search.set("room_id", params.roomId)
  if (params.packageId) search.set("package_id", params.packageId)
  if (params.bookingId) search.set("booking_id", params.bookingId)
  if (params.errorMessage) search.set("error", params.errorMessage)

  const query = search.toString()
  return query ? `/merchant/chat?${query}` : "/merchant/chat"
}
