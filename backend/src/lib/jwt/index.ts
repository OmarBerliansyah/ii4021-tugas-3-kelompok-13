import { createSign, createVerify } from 'node:crypto'
import type { JwtAlg } from '../../types/app'
import { base64UrlDecode, base64UrlEncode, decodeJson, encodeJson } from './base64url'
import { derToJose, joseToDer } from './ecdsa'

type JwtHeader = {
  alg: JwtAlg
  typ: 'JWT'
}

export type JwtClaims = {
  iss?: string
  sub?: string
  aud?: string
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

const hashByAlg: Record<JwtAlg, string> = {
  ES256: 'SHA256',
  ES384: 'SHA384',
  ES512: 'SHA512',
}

function assertJwtAlg(alg: unknown): asserts alg is JwtAlg {
  if (alg !== 'ES256' && alg !== 'ES384' && alg !== 'ES512') {
    throw new Error('Unsupported JWT alg')
  }
}

const signingInput = (header: string, payload: string) => `${header}.${payload}`

export const sign = (
  header: JwtHeader,
  claims: JwtClaims,
  payload: JwtPayload,
  privateKey: string,
) => {
  assertJwtAlg(header.alg)

  const encodedHeader = encodeJson(header)
  const encodedPayload = encodeJson({ ...payload, ...claims })
  const input = signingInput(encodedHeader, encodedPayload)
  const signer = createSign(hashByAlg[header.alg])
  signer.update(input)
  signer.end()

  const derSignature = signer.sign(privateKey)
  const signature = base64UrlEncode(derToJose(derSignature, header.alg))

  return `${input}.${signature}`
}

export const verify = (
  jwt: string,
  publicKey: string,
  options: VerifyOptions = {},
) => {
  const parts = jwt.split('.')
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw new Error('JWT must contain header, payload, and signature')
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts
  const header = decodeJson<JwtHeader>(encodedHeader)
  const payload = decodeJson<JwtPayload & JwtClaims>(encodedPayload)

  assertJwtAlg(header.alg)
  if (header.typ !== 'JWT') {
    throw new Error('JWT typ must be JWT')
  }

  if (options.algs && !options.algs.includes(header.alg)) {
    throw new Error('JWT alg is not allowed')
  }

  const verifier = createVerify(hashByAlg[header.alg])
  verifier.update(signingInput(encodedHeader, encodedPayload))
  verifier.end()

  const signature = joseToDer(base64UrlDecode(encodedSignature), header.alg)
  if (!verifier.verify(publicKey, signature)) {
    throw new Error('JWT signature is invalid')
  }

  const now = Math.floor(Date.now() / 1000)
  if (!options.ignoreExp && typeof payload.exp === 'number' && now >= payload.exp) {
    throw new Error('JWT is expired')
  }

  if (!options.ignoreNbf && typeof payload.nbf === 'number' && now < payload.nbf) {
    throw new Error('JWT is not active yet')
  }

  if (options.iss !== undefined && payload.iss !== options.iss) {
    throw new Error('JWT issuer is invalid')
  }

  if (options.sub !== undefined && payload.sub !== options.sub) {
    throw new Error('JWT subject is invalid')
  }

  if (options.aud !== undefined && payload.aud !== options.aud) {
    throw new Error('JWT audience is invalid')
  }

  if (options.jti !== undefined && payload.jti !== options.jti) {
    throw new Error('JWT ID is invalid')
  }

  return {
    header,
    payload,
    signature: encodedSignature,
  }
}
