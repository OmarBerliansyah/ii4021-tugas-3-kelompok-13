import { generateKeyPairSync } from 'node:crypto'
import type { Env, JwtAlg } from '../types'

const getEnv = (key: string) => process.env[key] ?? ''

const isJwtAlg = (value: string): value is JwtAlg =>
  value === 'ES256' || value === 'ES384' || value === 'ES512'

const curveByAlg: Record<JwtAlg, string> = {
  ES256: 'prime256v1',
  ES384: 'secp384r1',
  ES512: 'secp521r1',
}

const parseNumberEnv = (key: string, fallback: number) => {
  const value = Number(getEnv(key))
  return Number.isFinite(value) && value > 0 ? value : fallback
}

const alg = getEnv('JWT_ALG') || 'ES256'

if (!isJwtAlg(alg)) {
  throw new Error('JWT_ALG must be one of ES256, ES384, or ES512')
}

let jwtPrivateKeyPem = getEnv('JWT_PRIVATE_KEY_PEM').replace(/\\n/g, '\n')
let jwtPublicKeyPem = getEnv('JWT_PUBLIC_KEY_PEM').replace(/\\n/g, '\n')

if (!jwtPrivateKeyPem || !jwtPublicKeyPem) {
  const pair = generateKeyPairSync('ec', {
    namedCurve: curveByAlg[alg],
    privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
    publicKeyEncoding: { format: 'pem', type: 'spki' },
  })

  jwtPrivateKeyPem = pair.privateKey
  jwtPublicKeyPem = pair.publicKey
}

export const env: Env = {
  supabaseUrl: getEnv('SUPABASE_URL').replace(/\/$/, ''),
  supabaseServiceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
  jwtAlg: alg,
  jwtPrivateKeyPem,
  jwtPublicKeyPem,
  jwtIssuer: getEnv('JWT_ISSUER') || 'ii4021-chat-backend',
  jwtAudience: getEnv('JWT_AUDIENCE') || 'ii4021-chat-client',
  jwtExpiresInSeconds: parseNumberEnv('JWT_EXPIRES_IN_SECONDS', 60 * 60),
  port: parseNumberEnv('PORT', 3000),
}

export const assertSupabaseEnv = () => {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }
}
