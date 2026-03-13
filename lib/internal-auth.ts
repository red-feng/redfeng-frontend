export function normalizeInternalUsername(value: string) {
  return value.trim().toLowerCase()
}

export function isValidInternalUsername(value: string) {
  return /^[a-z0-9._-]{3,32}$/.test(value)
}

export function buildInternalAdminEmail(username: string) {
  return `${normalizeInternalUsername(username)}@admin.redfeng.internal`
}
