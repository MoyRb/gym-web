const INTERNAL_AUTH_DOMAIN = "fitnessclub.local"
const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])$/

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9._-]/g, "")
}

export function validateUsername(value: string): string | null {
  if (!value) return "El nombre de usuario es obligatorio"

  const normalized = normalizeUsername(value)

  if (!normalized) return "El nombre de usuario es obligatorio"
  if (normalized.length < 3 || normalized.length > 30) {
    return "El nombre de usuario debe tener entre 3 y 30 caracteres"
  }

  if (!USERNAME_REGEX.test(normalized)) {
    return "Usa solo letras minúsculas, números, punto, guion o guion bajo"
  }

  return null
}

export function usernameToInternalEmail(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_AUTH_DOMAIN}`
}
