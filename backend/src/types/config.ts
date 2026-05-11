import type { JwtAlg } from './jwt'

export type Env = {
  supabaseUrl: string
  supabaseServiceRoleKey: string
  jwtAlg: JwtAlg
  jwtPrivateKeyPem: string
  jwtPublicKeyPem: string
  jwtIssuer: string
  jwtAudience: string
  jwtExpiresInSeconds: number
  port: number
}
