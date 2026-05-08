export const base64UrlEncode = (input: Buffer | string) =>
  Buffer.from(input).toString('base64url')

export const base64UrlDecode = (input: string) => Buffer.from(input, 'base64url')

export const encodeJson = (value: unknown) =>
  base64UrlEncode(JSON.stringify(value))

export const decodeJson = <T>(value: string): T => {
  try {
    return JSON.parse(base64UrlDecode(value).toString('utf8')) as T
  } catch {
    throw new Error('JWT contains invalid JSON')
  }
}
