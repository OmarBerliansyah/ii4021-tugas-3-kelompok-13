import { env } from '../config/env'
import { verify } from './jwt'
import type { AuthUser } from '../types/app'

export const verifyAuthToken = (token: string): AuthUser => {
  const decoded = verify(token, env.jwtPublicKeyPem, {
    algs: [env.jwtAlg],
    iss: env.jwtIssuer,
    aud: env.jwtAudience,
  })

  const sub = decoded.payload.sub
  const email = decoded.payload.email
  if (typeof sub !== 'string' || typeof email !== 'string') {
    throw new Error('JWT subject or email is missing')
  }

  return { id: sub, email }
}
