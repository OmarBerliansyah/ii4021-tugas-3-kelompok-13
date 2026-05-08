import { HttpError } from './http-error'

export const requireString = (
  value: unknown,
  field: string,
  options: { min?: number; max?: number } = {},
) => {
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be a string`)
  }

  const trimmed = value.trim()
  if (options.min !== undefined && trimmed.length < options.min) {
    throw new HttpError(400, `${field} is too short`)
  }

  if (options.max !== undefined && trimmed.length > options.max) {
    throw new HttpError(400, `${field} is too long`)
  }

  return trimmed
}

export const requireEmail = (value: unknown) => {
  const email = requireString(value, 'email', { min: 3, max: 254 }).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'email is invalid')
  }

  return email
}
