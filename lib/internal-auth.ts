export function normalizeInternalUsername(value: string) {
  return value.trim().toLowerCase()
}

export function isValidInternalUsername(value: string) {
  return /^[a-z0-9._-]{3,32}$/.test(value)
}

export function buildInternalAdminEmail(username: string) {
  return `${normalizeInternalUsername(username)}@admin.redfeng.internal`
}

export function buildInternalFinanceEmail(username: string) {
  return `${normalizeInternalUsername(username)}@finance.redfeng.internal`
}

export function buildInternalSuperadminEmail(username: string) {
  return `${normalizeInternalUsername(username)}@superadmin.redfeng.internal`
}

export function resolveInternalLoginCandidates(usernameOrEmail: string) {
  const normalized = normalizeInternalUsername(usernameOrEmail)
  if (!normalized) return []
  if (normalized.includes("@")) return [normalized]
  return [
    buildInternalAdminEmail(normalized),
    buildInternalFinanceEmail(normalized),
    buildInternalSuperadminEmail(normalized),
  ]
}
