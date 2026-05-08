import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64

export const randomBase64Url = (size = 16) =>
  randomBytes(size).toString('base64url')

export const hashPassword = (password: string, salt = randomBase64Url()) => {
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('base64url')
  return { hash, salt }
}

export const verifyPassword = (
  password: string,
  expectedHash: string,
  salt: string,
) => {
  const actual = scryptSync(password, salt, KEY_LENGTH)
  const expected = Buffer.from(expectedHash, 'base64url')

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
