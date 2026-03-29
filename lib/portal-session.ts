export function buildPortalSessionError(error: string, role?: string | null) {
  const normalizedRole = String(role || "").trim().toLowerCase()
  if (normalizedRole) {
    return `${error}:${normalizedRole}`
  }
  return error
}

export function readPortalSessionErrorMessage(
  rawError: string | null | undefined,
  options: {
    noSession: string
    noProfile: string
    wrongPortalPrefix: string
  },
) {
  const error = String(rawError || "").trim()

  if (!error) return ""
  if (error === "session-ended") return options.noSession
  if (error === "no-profile") return options.noProfile

  if (error.startsWith("session-changed")) {
    const role = error.split(":")[1] || ""
    return role
      ? `${options.wrongPortalPrefix} Session aktif Anda sekarang memakai role ${role}.`
      : `${options.wrongPortalPrefix} Session aktif Anda sudah berubah di tab atau portal lain.`
  }

  if (error.startsWith("wrong-role:")) {
    const role = error.replace("wrong-role:", "")
    return `${options.wrongPortalPrefix} Role terdeteksi: ${role || "unknown"}.`
  }

  return ""
}
