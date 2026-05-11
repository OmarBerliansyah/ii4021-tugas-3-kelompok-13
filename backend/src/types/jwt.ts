export type JwtAlg = 'ES256' | 'ES384' | 'ES512'

export type JwtHeader = {
  alg: JwtAlg
  typ: 'JWT'
}

export type JwtClaims = {
  iss?: string
  sub?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  iat?: number
  jti?: string
}

export type JwtPayload = Record<string, unknown>

export type VerifyOptions = {
  algs?: JwtAlg[]
  iss?: string
  sub?: string
  aud?: string
  ignoreExp?: boolean
  ignoreNbf?: boolean
  jti?: string
}
